import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { createFellow, inviteFellow } from "@/services/honor/coach.service"
import { requestMagicLink } from "@/services/magic-auth/magic-auth.service"
import {
  importFellowAssessment,
  type HonorFramework,
} from "@/services/honor/assessment.service"
import {
  initiateUpload,
  uploadToS3,
  triggerProcessing,
} from "@/services/documents/documentService"

/**
 * Honor onboarding — one member, wired end-to-end to the IG Core process.
 *
 * REUSE, NOT RECREATE. The flow composes existing Core endpoints in order:
 *   1. createFellow           → POST /v1/agents/honor/coach/students (managed row)
 *   2. inviteFellow           → POST .../{id}/invite (mints the IG user + magic-link
 *                               intake + "honor" entitlement — gives us a SUBJECT
 *                               user to attach scores/docs to)
 *   3. PRISM CSV (mandatory)  → coach-scoped assessments/import (adapters →
 *                               assessments/assessment_scores, subject = member)
 *   4. optional frameworks    → same import path (DISC / CLIFTON / BIG_FIVE /
 *                               MBTI / HOGAN — the shipped adapters parse them)
 *   5. résumé / bio / notes   → document pipeline (S3 + pgvector RAG),
 *                               doc_kind resume|bio, so Aura/Nova retrieve them
 *
 * Injection is FREE downstream: `app/profile/loader.py` renders every framework
 * in <USER_PROFILE> on every chat turn, and the auto-attach rides résumé/bio in
 * <ATTACHED_DOCUMENTS>. This hook writes; it does not re-implement any of that.
 */

export type OptionalFrameworkKey = Exclude<HonorFramework, "PRISM">

export type HonorOnboardInput = {
  firstName: string
  lastName: string
  email: string
  /** IG role assigned on invite (mandatory in the wireframe's Add-Member form). */
  role: string
  background?: string
  target?: string
  cohort?: string
  /** Mandatory PRISM export (CSV / PDF / XLSX) — the source-of-truth assessment. */
  prismFile: File
  /** Optional behavioural reports, one file per provided framework. */
  frameworkFiles?: Partial<Record<OptionalFrameworkKey, File>>
  /** Send the magic-link intake email now (default true). Off = create the
   *  account silently; the coach sends the invite later from My Fellows. */
  sendInvitation?: boolean
  resumeFile?: File | null
  bio?: string
  additionalInfo?: string
  /** Optional Bio file (pdf/doc/docx/xls/xlsx) — supplements/replaces the bio text. */
  bioFile?: File | null
  /** Optional Additional-Information file — stored with the bio in RAG (doc_kind "bio"). */
  additionalInfoFile?: File | null
}

export type OnboardStepResult = {
  step: string
  ok: boolean
  detail?: string
}

export type HonorOnboardResult = {
  fellowId: string
  memberUserId?: string
  steps: OnboardStepResult[]
}

/** Turn a plain-text field into an uploadable document (bio / notes → RAG). */
async function uploadTextDocument(
  name: string,
  text: string,
  docKind: string,
  subjectUserId?: string,
) {
  const file = new File([text], name, { type: "text/plain" })
  await uploadFileDocument(file, docKind, subjectUserId)
}

/**
 * Reusable 3-step presigned upload → process (document-service).
 * When `subjectUserId` is supplied (a coach uploading a member's doc), the row
 * is attributed to the MEMBER so it injects into their RAG — not the coach's.
 * Requires a coach-capable role server-side; omitted → server defaults to self.
 */
async function uploadFileDocument(file: File, docKind: string, subjectUserId?: string) {
  const presigned = await initiateUpload({
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    file_size: file.size,
    doc_kind: docKind,
    ...(subjectUserId ? { subject_user_id: subjectUserId } : {}),
  })
  await uploadToS3(presigned.upload_url, presigned.upload_fields, file)
  await triggerProcessing(presigned.document_id)
}

export async function runHonorOnboard(
  input: HonorOnboardInput,
): Promise<HonorOnboardResult> {
  const steps: OnboardStepResult[] = []

  // 1. Create the managed roster row.
  const createResp = await createFellow({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    background: input.background,
    target: input.target,
    cohort: input.cohort,
    // role rides along; the create model ignores unknowns, invite provisions it.
    ...(input.role ? { role: input.role } : {}),
  } as Record<string, unknown>)
  const fellow = createResp.data
  const fellowId = fellow?.id
  if (!fellowId) throw new Error("Fellow was created but no id was returned")
  steps.push({ step: "create", ok: true, detail: `${input.firstName} ${input.lastName}` })

  const result: HonorOnboardResult = { fellowId, steps }

  // The invite RE-KEYS the fellow row to the invited user's canonical sub, so the
  // create-time `fellowId` goes STALE the moment the invite succeeds. Every
  // subject-scoped import below must target the POST-INVITE id — which the invite
  // endpoint returns under `data.fellowId` (NOT `data.id`; that field is absent).
  // Default to the create id only if the invite response omits the new id.
  let effectiveFellowId = fellowId

  // 2. Invite → mint the IG user so assessments/docs have a SUBJECT to attach to.
  try {
    const sendInvite = input.sendInvitation !== false
    const inviteResp = await inviteFellow(
      fellowId,
      input.role.toLowerCase() !== "fellow",
      sendInvite,
    )
    effectiveFellowId = inviteResp.data?.fellowId ?? inviteResp.data?.id ?? fellowId
    // The re-keyed fellow id IS the fellow's canonical sub, so it doubles as the
    // subject for doc attribution when the invite omits an explicit `userId`.
    result.memberUserId = inviteResp.data?.userId ?? inviteResp.data?.fellowId
    // The account is created either way; fire the magic-link intake email only
    // when the coach chose to notify now.
    if (sendInvite && inviteResp.data?.invitationSent && inviteResp.data?.email) {
      try {
        await requestMagicLink({ email: inviteResp.data.email })
        steps.push({ step: "invite", ok: true, detail: "account created — magic-link intake sent" })
      } catch {
        steps.push({ step: "invite", ok: true, detail: "account created — invite email deferred (send failed)" })
      }
    } else {
      steps.push({ step: "invite", ok: true, detail: "account created — invitation not sent (send later)" })
    }
  } catch (e) {
    steps.push({ step: "invite", ok: false, detail: errMsg(e) })
    // Without an invited member the subject-scoped writes below will 409;
    // surface that clearly rather than silently dropping the assessments.
    throw new Error(`Fellow created, but the invite failed (${errMsg(e)}). ` +
      `PRISM/framework scores need an invited member to attach to.`)
  }

  // 3. PRISM CSV — mandatory. Use the POST-INVITE id (see re-key note above).
  try {
    const imp = await importFellowAssessment(effectiveFellowId, "PRISM", input.prismFile)
    steps.push({ step: "prism", ok: true, detail: `${imp.scoreCount} scores` })
  } catch (e) {
    steps.push({ step: "prism", ok: false, detail: errMsg(e) })
  }

  // 4. Optional frameworks — one import per provided file (post-invite id).
  for (const [fw, file] of Object.entries(input.frameworkFiles ?? {})) {
    if (!file) continue
    try {
      const imp = await importFellowAssessment(effectiveFellowId, fw as HonorFramework, file)
      steps.push({ step: fw, ok: true, detail: `${imp.scoreCount} scores` })
    } catch (e) {
      steps.push({ step: fw, ok: false, detail: errMsg(e) })
    }
  }

  // 5. Résumé / bio / additional info → document RAG, attributed to the MEMBER
  // (subject = their sub) so the docs inject into the member's context, not the
  // coach's. Falls back to self-attribution if the invite didn't return a sub.
  const subject = result.memberUserId
  if (input.resumeFile) {
    try {
      await uploadFileDocument(input.resumeFile, "resume", subject)
      steps.push({ step: "resume", ok: true })
    } catch (e) {
      steps.push({ step: "resume", ok: false, detail: errMsg(e) })
    }
  }
  const bioText = [input.bio?.trim(), input.additionalInfo?.trim()]
    .filter(Boolean)
    .join("\n\n")
  if (bioText) {
    try {
      await uploadTextDocument(`${input.firstName}_${input.lastName}_bio.txt`, bioText, "bio", subject)
      steps.push({ step: "bio", ok: true })
    } catch (e) {
      steps.push({ step: "bio", ok: false, detail: errMsg(e) })
    }
  }
  // Uploaded Bio / Additional-Information files supplement (or replace) the text —
  // both ride the same doc_kind "bio" so they inject into the member's RAG.
  if (input.bioFile) {
    try {
      await uploadFileDocument(input.bioFile, "bio", subject)
      steps.push({ step: "bio-file", ok: true, detail: input.bioFile.name })
    } catch (e) {
      steps.push({ step: "bio-file", ok: false, detail: errMsg(e) })
    }
  }
  if (input.additionalInfoFile) {
    try {
      await uploadFileDocument(input.additionalInfoFile, "bio", subject)
      steps.push({ step: "additional-info-file", ok: true, detail: input.additionalInfoFile.name })
    } catch (e) {
      steps.push({ step: "additional-info-file", ok: false, detail: errMsg(e) })
    }
  }

  return result
}

function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as Error).message)
  return String(e)
}

/** React Query mutation wrapper (Service → Hook → Component). */
export function useHonorOnboard() {
  return useMutation<HonorOnboardResult, Error, HonorOnboardInput>({
    mutationFn: runHonorOnboard,
    onSuccess: (res) => {
      const failed = res.steps.filter((s) => !s.ok)
      if (failed.length === 0) {
        toast.success("Fellow onboarded — invite sent, scores + documents attached.")
      } else {
        toast.warning(
          `Fellow added, but ${failed.length} step(s) need attention: ` +
            failed.map((f) => f.step).join(", "),
        )
      }
    },
    onError: (err) => toast.error(err.message || "Onboarding failed"),
  })
}

import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { createFellow, inviteFellow, setFellowGoals } from "@/services/honor/coach.service"
import {
  importFellowAssessment,
  type HonorFramework,
} from "@/services/honor/assessment.service"
import { uploadFellowDocument } from "@/services/honor/artifact.service"

/**
 * Honor onboarding — one member, wired end-to-end to the IG Core process.
 *
 * REUSE, NOT RECREATE. The flow composes existing Core endpoints in order:
 *   1. createFellow           → POST /v1/agents/honor/coach/students (managed row)
 *   2. inviteFellow           → POST .../{id}/invite (mints the IG user + magic-link
 *                               intake + "honor" entitlement — gives us a SUBJECT
 *                               user to attach scores/docs to)
 *   3. PRISM CSV (optional)   → coach-scoped assessments/import (adapters →
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
  /** Optional PRISM export (CSV / PDF / XLSX). When present it's imported as the
   *  source-of-truth assessment; a fellow can be onboarded without one. */
  prismFile?: File | null
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
  /** Optional goals & objectives text — stored via the coach goals endpoint. */
  goals?: string
  /** Optional goals file — stored in the member's RAG (doc_kind "personal"). */
  goalsFile?: File | null
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
  docKind: "resume" | "bio" | "personal",
  subjectUserId?: string,
) {
  const file = new File([text], name, { type: "text/plain" })
  await uploadFellowDocument(file, docKind, subjectUserId)
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
    // THF invite: the backend sends the "Acknowledge invitation" confirmation
    // email itself (no magic-link, Fellows are not IG users). Nothing to fire here.
    if (sendInvite && inviteResp.data?.invitationSent) {
      steps.push({ step: "invite", ok: true, detail: "fellow invited — acknowledge email sent" })
    } else {
      steps.push({ step: "invite", ok: true, detail: "fellow created — invitation not sent (send later)" })
    }
  } catch (e) {
    steps.push({ step: "invite", ok: false, detail: errMsg(e) })
    // Without an invited member the subject-scoped writes below will 409;
    // surface that clearly rather than silently dropping the assessments.
    throw new Error(`Fellow created, but the invite failed (${errMsg(e)}). ` +
      `PRISM/framework scores need an invited member to attach to.`)
  }

  // 3. PRISM CSV — OPTIONAL. Import only when a file was provided; the fellow can
  // be onboarded without one. Use the POST-INVITE id (see re-key note above).
  if (input.prismFile) {
    try {
      const imp = await importFellowAssessment(effectiveFellowId, "PRISM", input.prismFile)
      steps.push({ step: "prism", ok: true, detail: `${imp.scoreCount} scores` })
    } catch (e) {
      steps.push({ step: "prism", ok: false, detail: errMsg(e) })
    }
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
      await uploadFellowDocument(input.resumeFile, "resume", subject)
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
      await uploadFellowDocument(input.bioFile, "bio", subject)
      steps.push({ step: "bio-file", ok: true, detail: input.bioFile.name })
    } catch (e) {
      steps.push({ step: "bio-file", ok: false, detail: errMsg(e) })
    }
  }
  if (input.additionalInfoFile) {
    try {
      await uploadFellowDocument(input.additionalInfoFile, "bio", subject)
      steps.push({ step: "additional-info-file", ok: true, detail: input.additionalInfoFile.name })
    } catch (e) {
      steps.push({ step: "additional-info-file", ok: false, detail: errMsg(e) })
    }
  }

  // 6. Goals & objectives — the free text persists via the coach goals endpoint
  // (subject = the invited member); an uploaded goals file rides the member's
  // RAG as a "personal" doc so the coaching agents retrieve it.
  const goalsText = input.goals?.trim()
  if (goalsText) {
    try {
      await setFellowGoals(effectiveFellowId, goalsText)
      steps.push({ step: "goals", ok: true })
    } catch (e) {
      steps.push({ step: "goals", ok: false, detail: errMsg(e) })
    }
  }
  if (input.goalsFile) {
    try {
      await uploadFellowDocument(input.goalsFile, "personal", subject)
      steps.push({ step: "goals-file", ok: true, detail: input.goalsFile.name })
    } catch (e) {
      steps.push({ step: "goals-file", ok: false, detail: errMsg(e) })
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

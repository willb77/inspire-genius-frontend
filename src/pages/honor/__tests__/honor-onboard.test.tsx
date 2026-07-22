/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"

/* ── Service mocks ── */
const createFellow = jest.fn()
const inviteFellow = jest.fn()
const setFellowGoals = jest.fn()
jest.mock("@/services/honor/coach.service", () => ({
  createFellow: (...a: unknown[]) => createFellow(...a),
  inviteFellow: (...a: unknown[]) => inviteFellow(...a),
  setFellowGoals: (...a: unknown[]) => setFellowGoals(...a),
}))

const importFellowAssessment = jest.fn()
jest.mock("@/services/honor/assessment.service", () => ({
  importFellowAssessment: (...a: unknown[]) => importFellowAssessment(...a),
  HONOR_FRAMEWORK_LABELS: {
    PRISM: "PRISM (source of truth)",
    DISC: "DISC",
    CLIFTON: "CliftonStrengths (StrengthsFinder)",
    BIG_FIVE: "The Big Five (OCEAN)",
    MBTI: "Myers-Briggs (MBTI)",
    HOGAN: "Hogan",
  },
}))

const initiateUpload = jest.fn()
const uploadToS3 = jest.fn()
const triggerProcessing = jest.fn()
jest.mock("@/services/documents/documentService", () => ({
  initiateUpload: (...a: unknown[]) => initiateUpload(...a),
  uploadToS3: (...a: unknown[]) => uploadToS3(...a),
  triggerProcessing: (...a: unknown[]) => triggerProcessing(...a),
}))

jest.mock("sonner", () => ({ toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn(), info: jest.fn() } }))

import { runHonorOnboard } from "@/hooks/honor/useHonorOnboard"

function file(name: string) {
  return new File(["x"], name, { type: "text/csv" })
}

describe("runHonorOnboard — IG Core reuse pipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    createFellow.mockResolvedValue({ data: { id: "fellow-1" } })
    inviteFellow.mockResolvedValue({ data: { userId: "user-9" } })
    setFellowGoals.mockResolvedValue({ data: { fellowId: "fellow-1", goals: "x", hasGoals: true } })
    importFellowAssessment.mockResolvedValue({ id: "a1", scoreCount: 4, subjectUserId: "user-9" })
    initiateUpload.mockResolvedValue({ document_id: "d1", upload_url: "u", upload_fields: {} })
    uploadToS3.mockResolvedValue(undefined)
    triggerProcessing.mockResolvedValue({ id: "d1" })
  })

  test("creates → invites → imports PRISM + optional frameworks → uploads résumé/bio, subject = member", async () => {
    const res = await runHonorOnboard({
      firstName: "Marcus",
      lastName: "Reyes",
      email: "marcus@honor.org",
      role: "Fellow",
      prismFile: file("prism.csv"),
      frameworkFiles: { DISC: file("disc.csv"), HOGAN: file("hogan.pdf") },
      resumeFile: file("resume.pdf"),
      bio: "Naval Special Warfare veteran.",
      additionalInfo: "Prefers async coaching.",
    })

    // Order: create before invite before any import.
    expect(createFellow).toHaveBeenCalledTimes(1)
    expect(inviteFellow).toHaveBeenCalledWith("fellow-1", false, true)

    // PRISM (mandatory) + the two optional frameworks all import against the fellow.
    expect(importFellowAssessment).toHaveBeenCalledWith("fellow-1", "PRISM", expect.any(File))
    expect(importFellowAssessment).toHaveBeenCalledWith("fellow-1", "DISC", expect.any(File))
    expect(importFellowAssessment).toHaveBeenCalledWith("fellow-1", "HOGAN", expect.any(File))
    expect(importFellowAssessment).toHaveBeenCalledTimes(3)

    // Résumé + a combined bio doc go through the document pipeline.
    expect(initiateUpload).toHaveBeenCalledTimes(2)
    expect(triggerProcessing).toHaveBeenCalledTimes(2)

    expect(res.fellowId).toBe("fellow-1")
    expect(res.memberUserId).toBe("user-9")
    expect(res.steps.every((s) => s.ok)).toBe(true)
  })

  test("imports against the POST-INVITE id when the invite re-keys the fellow", async () => {
    // The invite re-keys the managed row to the invited user's canonical sub, so
    // the create-time id goes stale. Every import must use the returned id — which
    // the backend returns under `fellowId` (NOT `id`; that field is absent).
    inviteFellow.mockResolvedValue({ data: { fellowId: "canonical-sub-42" } })

    await runHonorOnboard({
      firstName: "Marcus",
      lastName: "Reyes",
      email: "marcus@honor.org",
      role: "Fellow",
      prismFile: file("prism.csv"),
      frameworkFiles: { DISC: file("disc.csv") },
    })

    // Both the mandatory PRISM and optional framework imports use the new id,
    // never the stale create-time "fellow-1".
    expect(importFellowAssessment).toHaveBeenCalledWith("canonical-sub-42", "PRISM", expect.any(File))
    expect(importFellowAssessment).toHaveBeenCalledWith("canonical-sub-42", "DISC", expect.any(File))
    expect(importFellowAssessment).not.toHaveBeenCalledWith("fellow-1", "PRISM", expect.any(File))
  })

  test("uploads provided Bio and Additional-Information files through the document pipeline", async () => {
    await runHonorOnboard({
      firstName: "Marcus",
      lastName: "Reyes",
      email: "marcus@honor.org",
      role: "Fellow",
      prismFile: file("prism.csv"),
      bioFile: file("bio.pdf"),
      additionalInfoFile: file("extra.docx"),
    })

    // PRISM import + résumé/bio pipeline: two document uploads (bio file + addl file).
    expect(initiateUpload).toHaveBeenCalledTimes(2)
    expect(triggerProcessing).toHaveBeenCalledTimes(2)
  })

  test("persists goals text via the goals endpoint and uploads a goals file to RAG", async () => {
    await runHonorOnboard({
      firstName: "Marcus",
      lastName: "Reyes",
      email: "marcus@honor.org",
      role: "Fellow",
      prismFile: file("prism.csv"),
      goals: "Move into an operations program-management role",
      goalsFile: file("goals.pdf"),
    })

    // Goals text is stored against the invited member (effective id fellow-1 here).
    expect(setFellowGoals).toHaveBeenCalledWith(
      "fellow-1",
      "Move into an operations program-management role",
    )
    // The goals file rides the member's RAG as a "personal" document.
    expect(initiateUpload).toHaveBeenCalledWith(
      expect.objectContaining({ doc_kind: "personal", subject_user_id: "user-9" }),
    )
  })

  test("aborts assessment writes if the invite fails (no subject to attach to)", async () => {
    inviteFellow.mockRejectedValue(new Error("invite boom"))
    await expect(
      runHonorOnboard({
        firstName: "A",
        lastName: "B",
        email: "a@b.org",
        role: "Fellow",
        prismFile: file("prism.csv"),
      }),
    ).rejects.toThrow(/invite failed/i)
    expect(importFellowAssessment).not.toHaveBeenCalled()
  })
})

/* ── Landing page ── */
const mockUseAuth = jest.fn()
jest.mock("@/context/useAuth", () => ({ useAuth: () => mockUseAuth() }))
jest.mock("@/hooks/magic-auth/useMagicAuth", () => ({
  useRequestMagicLink: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))

import HonorLanding from "../HonorLanding"

describe("HonorLanding — standalone entry", () => {
  beforeEach(() => jest.clearAllMocks())

  test("shows the magic-link sign-in for an anonymous visitor", () => {
    mockUseAuth.mockReturnValue({ user: null })
    render(
      <MemoryRouter initialEntries={["/honor"]}>
        <Routes>
          <Route path="/honor" element={<HonorLanding />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText("The Honor Foundation")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /send magic link/i })).toBeInTheDocument()
  })

  test("forwards an authenticated visitor into the workbench", () => {
    mockUseAuth.mockReturnValue({ user: { email: "s.carter@honor.org" } })
    render(
      <MemoryRouter initialEntries={["/honor"]}>
        <Routes>
          <Route path="/honor" element={<HonorLanding />} />
          <Route path="/vertical/honor/dashboard" element={<div>Workbench</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText("Workbench")).toBeInTheDocument()
  })
})

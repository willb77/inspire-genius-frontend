/**
 * InterviewFrameForm — the curated role picker.
 *
 * The assertions that matter here are the two the Change Safety Assessment
 * turned on:
 *   1. with no catalogue (backend absent), the form is EXACTLY as it was —
 *      no picker, no dead control, submission unaffected;
 *   2. with a catalogue, picking a role sets the slug on the frame and does
 *      not clobber a role title the candidate already typed.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import InterviewFrameForm from "../InterviewFrameForm"
import { getRolePackCatalogue } from "@/services/interview/practice.service"

jest.mock("@/services/interview/practice.service", () => ({
  ...jest.requireActual("@/services/interview/practice.service"),
  getRolePackCatalogue: jest.fn(),
  getEmployerPackCatalogue: jest.fn().mockResolvedValue({
    provenance: "", employers: [], sectors: [],
  }),
}))

const mockCatalogue = getRolePackCatalogue as jest.Mock

const ROLES = [
  { slug: "ts-cyber-grc-associate", title: "T&S and Cyber GRC Associate", level: "Entry level", levelOrder: 1, seniority: "associate", family: "Trust & Safety", competencyCount: 12, questionCount: 36 },
  { slug: "ts-cyber-grc-analyst", title: "T&S and Cyber GRC Analyst", level: "Individual contributor", levelOrder: 2, seniority: "analyst", family: "Trust & Safety", competencyCount: 12, questionCount: 36 },
]

function renderForm(props: Partial<React.ComponentProps<typeof InterviewFrameForm>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onConfirm = jest.fn()
  render(
    <QueryClientProvider client={client}>
      <InterviewFrameForm onConfirm={onConfirm} showRolePacks {...props} />
    </QueryClientProvider>,
  )
  return { onConfirm }
}

beforeEach(() => jest.clearAllMocks())

describe("when the backend has no role packs (or is unreachable)", () => {
  it("renders NO picker at all — the form is unchanged from before this feature", async () => {
    mockCatalogue.mockResolvedValue({ provenance: "", roles: [] })
    renderForm()
    // The role-title field (pre-existing) is still there...
    expect(await screen.findByLabelText(/role title being interviewed for/i)).toBeInTheDocument()
    // ...and the picker is absent, not present-and-empty.
    await waitFor(() => {
      expect(screen.queryByLabelText(/practising for one of these roles/i)).not.toBeInTheDocument()
    })
  })
})

describe("when role packs are available", () => {
  beforeEach(() => mockCatalogue.mockResolvedValue({ provenance: "Curated by IG.", roles: ROLES }))

  it("renders the picker with a no-op default first", async () => {
    renderForm()
    const select = await screen.findByLabelText(/practising for one of these roles/i)
    expect((select as HTMLSelectElement).value).toBe("")
    expect(screen.getByRole("option", { name: /describe my own role/i })).toBeInTheDocument()
  })

  it("lists roles in ladder order, not alphabetical", async () => {
    renderForm()
    await screen.findByLabelText(/practising for one of these roles/i)
    const options = screen.getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value)
      .filter(Boolean)
    expect(options).toEqual(["ts-cyber-grc-associate", "ts-cyber-grc-analyst"])
  })

  it("shows the set size and the provenance once a role is picked", async () => {
    renderForm()
    const select = await screen.findByLabelText(/practising for one of these roles/i)
    await userEvent.selectOptions(select, "ts-cyber-grc-analyst")
    expect(await screen.findByText(/12 competencies · 36 questions/)).toBeInTheDocument()
    expect(screen.getByText(/curated by ig\./i)).toBeInTheDocument()
  })

  it("fills an EMPTY role title from the picked pack", async () => {
    renderForm()
    const select = await screen.findByLabelText(/practising for one of these roles/i)
    await userEvent.selectOptions(select, "ts-cyber-grc-analyst")
    const roleTitle = screen.getByLabelText(/role title being interviewed for/i) as HTMLInputElement
    await waitFor(() => expect(roleTitle.value).toBe("T&S and Cyber GRC Analyst"))
  })

  it("does NOT clobber a role title the candidate already typed", async () => {
    // Silently overwriting the candidate's own words would be the kind of
    // helpful-looking data loss that is hard to notice and hard to undo.
    renderForm()
    const roleTitle = screen.getByLabelText(/role title being interviewed for/i) as HTMLInputElement
    await userEvent.type(roleTitle, "Head of Platform Integrity")
    const select = await screen.findByLabelText(/practising for one of these roles/i)
    await userEvent.selectOptions(select, "ts-cyber-grc-analyst")
    await waitFor(() => expect(roleTitle.value).toBe("Head of Platform Integrity"))
  })

  it("carries the picked slug onto the submitted frame", async () => {
    const { onConfirm } = renderForm()
    const select = await screen.findByLabelText(/practising for one of these roles/i)
    await userEvent.selectOptions(select, "ts-cyber-grc-associate")

    await userEvent.type(screen.getByLabelText(/company/i), "Acme")
    await userEvent.type(screen.getByLabelText(/industry \/ sector/i), "Technology")
    await userEvent.type(screen.getByLabelText(/reporting line/i), "Head of T&S")
    await userEvent.type(screen.getByLabelText(/scope of responsibility/i), "One queue")

    await userEvent.click(screen.getByRole("button", { name: /confirm & start/i }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    expect(onConfirm.mock.calls[0][0]).toMatchObject({
      rolePackSlug: "ts-cyber-grc-associate",
      rolePackTitle: "T&S and Cyber GRC Associate",
    })
  })

  it("submits with NO slug when the candidate leaves the default — the ungated path", async () => {
    const { onConfirm } = renderForm()
    await screen.findByLabelText(/practising for one of these roles/i)

    await userEvent.type(screen.getByLabelText(/company/i), "Acme")
    await userEvent.type(screen.getByLabelText(/industry \/ sector/i), "Technology")
    await userEvent.type(screen.getByLabelText(/role title being interviewed for/i), "Analyst")
    await userEvent.type(screen.getByLabelText(/reporting line/i), "Head of T&S")
    await userEvent.type(screen.getByLabelText(/scope of responsibility/i), "One queue")

    await userEvent.click(screen.getByRole("button", { name: /confirm & start/i }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    expect(onConfirm.mock.calls[0][0].rolePackSlug).toBeFalsy()
  })
})

/**
 * @jest-environment jsdom
 *
 * MeridianDevelopmentPanel — the manager's Meridian panel on a member dossier.
 *
 * The two behaviours pinned here are the two that failed in production:
 *
 *  1. a question is sent over the **async-jobs** transport, carrying
 *     `surface: "team_development"` and the member id — the agent-engine reads
 *     both in `app/profile/surface_grounding.py` to ground the reply in the
 *     MEMBER's PRISM. Drop them and Meridian answers about the manager,
 *     fluently, under the member's name;
 *  2. a transport failure is **rendered**. The predecessor of this panel
 *     discarded the error frame, so a send that reached nothing looked exactly
 *     like a question waiting to be answered — which is how a tier-wide outage
 *     stayed invisible.
 */

/* ---- Module mocks (hoisted) ---- */
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { id: "mgr-1", token: "t" }, isAuthenticated: true }),
}))

const mockSend = jest.fn()
const mockClearError = jest.fn()
let chatState: { isProcessing: boolean; partial: string; error: string | null } = {
  isProcessing: false,
  partial: "",
  error: null,
}
let capturedOptions: Record<string, unknown> = {}
jest.mock("@/hooks/agents/useMeridianChat", () => ({
  useMeridianChat: (opts: Record<string, unknown>) => {
    capturedOptions = opts
    return {
      send: mockSend,
      isProcessing: chatState.isProcessing,
      partial: chatState.partial,
      error: chatState.error,
      clearError: mockClearError,
      isPushConnected: true,
    }
  },
}))

const mockSaveChat = jest.fn()
jest.mock("@/hooks/manager/development", () => ({
  useLearningPlan: () => ({ mutate: jest.fn() }),
  useCreateMilestone: () => ({ mutate: jest.fn() }),
  useGoalSession: () => ({ mutate: jest.fn(), isPending: false }),
  useDossierChat: () => ({ data: [] }),
  useSaveChatMessage: () => ({ mutate: mockSaveChat }),
}))

import { StrictMode } from "react"
import { fireEvent, render, screen } from "@testing-library/react"

import { MeridianDevelopmentPanel } from "../MeridianDevelopmentPanel"

// jsdom doesn't implement Element.scrollTo — the panel autoscrolls on new turns.
beforeAll(() => {
  Element.prototype.scrollTo = jest.fn()
})

function renderPanel() {
  return render(
    <MeridianDevelopmentPanel
      memberId="member-1"
      memberName="Ben B"
      tab="profile"
      goals={[{ goalId: "g1", title: "Lead a release" }]}
      gaps={[{ gapId: "gap1", competency: "Delegation" }]}
    />,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  chatState = { isProcessing: false, partial: "", error: null }
  capturedOptions = {}
})

describe("MeridianDevelopmentPanel", () => {
  it("grounds the conversation in the member, not the manager", () => {
    renderPanel()
    expect(capturedOptions.sessionKey).toBe("member-1")
    expect(capturedOptions.context).toMatchObject({
      surface: "team_development",
      member_id: "member-1",
      member_name: "Ben B",
    })
  })

  it("forwards real goal and gap ids so a proposed action can't invent one", () => {
    renderPanel()
    expect(capturedOptions.context).toMatchObject({
      goals: [{ goalId: "g1", title: "Lead a release" }],
      gaps: [{ gapId: "gap1", competency: "Delegation" }],
    })
  })

  it("sends the manager's question and persists the turn", () => {
    renderPanel()
    const input = screen.getByLabelText(/ask meridian about this member/i)
    fireEvent.change(input, { target: { value: "can ben do sales" } })
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }))

    expect(mockSend).toHaveBeenCalledWith("can ben do sales", { active_tab: "profile" })
    expect(mockSaveChat).toHaveBeenCalledWith({ role: "user", content: "can ben do sales" })
    expect(screen.getByText("can ben do sales")).toBeInTheDocument()
  })

  it("renders a transport failure instead of swallowing it", () => {
    chatState = { isProcessing: false, partial: "", error: "Failed to process message" }
    renderPanel()
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Failed to process message")
  })

  it("lets the manager dismiss the failure", () => {
    chatState = { isProcessing: false, partial: "", error: "Failed to process message" }
    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }))
    expect(mockClearError).toHaveBeenCalled()
  })

  it("shows a thinking state while a turn is in flight", () => {
    chatState = { isProcessing: true, partial: "", error: null }
    renderPanel()
    expect(screen.getAllByText(/thinking/i).length).toBeGreaterThan(0)
  })

  it("renders partial content when the server streams progress", () => {
    chatState = { isProcessing: true, partial: "Ben leans analytical", error: null }
    renderPanel()
    expect(screen.getByText(/ben leans analytical/i)).toBeInTheDocument()
  })

  it("does not claim a socket is connected — the socket does not carry the question", () => {
    renderPanel()
    expect(screen.queryByText(/^connected$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/connecting/i)).not.toBeInTheDocument()
  })
})

describe("goals not shared (Goals offering, Phase 4)", () => {
  it("says the member has not shared their goals, in a sentence", () => {
    render(
      <MeridianDevelopmentPanel memberId="m1" memberName="Mark Tully" tab="goals" goals={[]} gaps={[]} goalsNotShared />,
    )
    expect(screen.getByTestId("meridian-goals-not-shared")).toHaveTextContent(
      "Mark Tully has not shared their goals with you, so Meridian cannot see them either.",
    )
  })

  it("says nothing when goals are shared", () => {
    render(<MeridianDevelopmentPanel memberId="m1" memberName="Mark Tully" tab="goals" goals={[]} gaps={[]} />)
    expect(screen.queryByTestId("meridian-goals-not-shared")).not.toBeInTheDocument()
  })
})

describe('"Start growth conversation" seeds a real turn (TDS-4b)', () => {
  // The button used to be `setTab("goals")` and nothing else: it opened a tab
  // and started no conversation. What matters is that the seed goes over the
  // SAME path as a typed question — so it is persisted, it appears in the
  // transcript, and a failure is rendered rather than swallowed.
  function renderWithSeed(seedRequest?: number, memberName = "Dana Whitfield") {
    return render(
      <MeridianDevelopmentPanel
        memberId="member-1"
        memberName={memberName}
        tab="profile"
        goals={[]}
        gaps={[]}
        seedRequest={seedRequest}
      />,
    )
  }

  it("sends an opening turn naming the member when the request arrives", () => {
    const { rerender } = renderWithSeed(0)
    expect(mockSend).not.toHaveBeenCalled()
    rerender(
      <MeridianDevelopmentPanel
        memberId="member-1"
        memberName="Dana Whitfield"
        tab="profile"
        goals={[]}
        gaps={[]}
        seedRequest={1}
      />,
    )
    expect(mockSend).toHaveBeenCalledTimes(1)
    const [text, ctx] = mockSend.mock.calls[0]
    expect(text).toMatch(/growth conversation with Dana Whitfield/)
    expect(ctx).toEqual({ active_tab: "profile" })
  })

  it("persists the seeded turn and shows it, like any other question", () => {
    renderWithSeed(1)
    expect(mockSaveChat).toHaveBeenCalledWith({
      role: "user",
      content: expect.stringContaining("growth conversation with Dana Whitfield"),
    })
    expect(screen.getByText(/growth conversation with Dana Whitfield/)).toBeInTheDocument()
  })

  it("sends once per request, not once per render", () => {
    const { rerender } = renderWithSeed(1)
    expect(mockSend).toHaveBeenCalledTimes(1)
    rerender(
      <MeridianDevelopmentPanel memberId="member-1" memberName="Dana Whitfield" tab="goals" goals={[]} gaps={[]} seedRequest={1} />,
    )
    expect(mockSend).toHaveBeenCalledTimes(1)
    rerender(
      <MeridianDevelopmentPanel memberId="member-1" memberName="Dana Whitfield" tab="goals" goals={[]} gaps={[]} seedRequest={2} />,
    )
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it("does not send when no conversation was asked for", () => {
    renderWithSeed(undefined)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it("falls back to 'this member' rather than addressing a blank name", () => {
    renderWithSeed(1, "  ")
    expect(mockSend.mock.calls[0][0]).toMatch(/growth conversation with this member/)
  })

  // The ref-guard's real job. React StrictMode runs an effect setup, cleanup and
  // setup again on the same fiber in development, so without the guard one press
  // sends the opening turn twice — two questions, two persisted rows, and the
  // manager asked for one.
  it("sends once even when the effect is invoked twice for the same request", () => {
    render(
      <StrictMode>
        <MeridianDevelopmentPanel
          memberId="member-1"
          memberName="Dana Whitfield"
          tab="profile"
          goals={[]}
          gaps={[]}
          seedRequest={1}
        />
      </StrictMode>,
    )
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it("a seeded turn that failed says so — it does not sit there looking sent", () => {
    chatState = { isProcessing: false, partial: "", error: "Meridian couldn't answer that." }
    renderWithSeed(1)
    expect(screen.getByRole("alert")).toHaveTextContent("Meridian couldn't answer that.")
  })
})

it("offers prompts on the Notes tab — the prompt lookup is indexed, not defaulted", () => {
  render(<MeridianDevelopmentPanel memberId="m1" memberName="Dana Whitfield" tab="notes" goals={[]} gaps={[]} />)
  expect(screen.getByRole("button", { name: /turn my last observation into a plan/i })).toBeInTheDocument()
})

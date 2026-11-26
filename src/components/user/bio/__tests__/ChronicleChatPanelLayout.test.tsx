/**
 * @jest-environment jsdom
 *
 * Phone layout + memoir card (Bio UX pass, PR 2):
 *  - the interview body no longer forces a 46rem minimum width / sideways
 *    scroll, and stacks (flex-col) below the sm breakpoint,
 *  - the insight rail is no longer hidden below sm,
 *  - a `railFooter` renders inside the rail, and the memoir card shows there.
 */
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { id: "member-1", token: "t" }, isAuthenticated: true }),
}))
jest.mock("@/hooks/agents/useMeridianChat", () => ({
  useMeridianChat: () => ({
    send: jest.fn(),
    isProcessing: false,
    partial: "",
    error: null,
    clearError: jest.fn(),
    isPushConnected: true,
  }),
}))
jest.mock("@/hooks/useCaptureBioTurn", () => ({
  useCaptureBioTurn: () => ({ mutate: jest.fn() }),
}))
jest.mock("@/hooks/useBioSessions", () => ({
  useBioSessions: () => ({ data: [], isLoading: false }),
  useSaveBioSession: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useLoadBioSession: () => ({ mutateAsync: jest.fn() }),
}))
jest.mock("@/hooks/useCompleteBioModule", () => {
  const m = () => ({ mutate: jest.fn(), reset: jest.fn(), isPending: false, error: null })
  return { useCompleteBioModule: m, useReopenBioModule: m }
})
jest.mock("@/hooks/useTTS", () => ({
  useTTS: () => ({
    speak: jest.fn(),
    stop: jest.fn(),
    speaking: false,
    pause: jest.fn(),
    resume: jest.fn(),
    isOnline: true,
    activeProvider: null,
  }),
}))
jest.mock("@/hooks/interview/useSpeechDictation", () => ({
  useSpeechDictation: () => ({
    supported: true,
    listening: false,
    start: jest.fn(),
    stop: jest.fn(),
    toggle: jest.fn(),
  }),
}))
jest.mock("@/components/user/chat/AssistantMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div>{text}</div>,
}))
jest.mock("@/lib/bio/clientMemoir", () => ({ moduleLabel: (m: string) => m }))
jest.mock("@/components/user/bio/MemoirExportMenu", () => ({
  __esModule: true,
  default: () => <button type="button">Export memoir</button>,
  MemoirExportMenu: () => <button type="button">Export memoir</button>,
}))

import { render, screen } from "@testing-library/react"
import ChronicleChatPanel from "@/components/user/bio/ChronicleChatPanel"
import BioMemoirCard from "@/components/user/bio/BioMemoirCard"
import type { MemberNarrative } from "@/types/bio"

beforeAll(() => {
  Element.prototype.scrollTo = jest.fn()
})

const narrative = {
  memberId: "member-1",
  bioStarted: true,
  modules: [],
  episodes: [],
  nextSuggestedModule: null,
} as unknown as MemberNarrative

describe("Chronicle panel — stacked phone layout", () => {
  it("has no 46rem minimum width and no sideways-scroll wrapper", () => {
    const { container } = render(<ChronicleChatPanel memberId="member-1" />)
    expect(container.innerHTML).not.toContain("min-w-[46rem]")
    expect(container.innerHTML).not.toContain("overflow-x-auto")
  })

  it("stacks below sm and keeps the insight rail visible on a phone", () => {
    const { container } = render(<ChronicleChatPanel memberId="member-1" />)
    const aside = container.querySelector("aside")
    expect(aside).not.toBeNull()
    expect(aside?.className).not.toMatch(/(^|\s)hidden(\s|$)/)
    expect(aside?.parentElement?.className).toMatch(/flex-col/)
    expect(aside?.parentElement?.className).toMatch(/sm:flex-row/)
  })

  it("renders railFooter inside the rail", () => {
    const { container } = render(
      <ChronicleChatPanel
        memberId="member-1"
        railFooter={<div>rail-footer-content</div>}
      />,
    )
    const aside = container.querySelector("aside")
    expect(aside).toContainElement(screen.getByText("rail-footer-content"))
  })

  it("renders nothing extra in the rail without a footer", () => {
    render(<ChronicleChatPanel memberId="member-1" />)
    expect(screen.queryByText("rail-footer-content")).toBeNull()
  })
})

describe("BioMemoirCard", () => {
  it("shows the heading, the blurb and the export action", () => {
    render(<BioMemoirCard memberId="member-1" narrative={narrative} />)
    expect(screen.getByText("Your memoir")).toBeInTheDocument()
    expect(
      screen.getByText(/document you can keep or share/i),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /export memoir/i })).toBeInTheDocument()
  })
})

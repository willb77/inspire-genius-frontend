/**
 * @jest-environment jsdom
 */

/* ---- Module mocks (must be before imports) ---- */

const mockUseAgentConversation = jest.fn();
jest.mock("@/hooks/agents/useAgentConversation", () => ({
  useAgentConversation: (...args: unknown[]) => mockUseAgentConversation(...args),
}));

const mockUseListDocuments = jest.fn();
jest.mock("@/hooks/documents/useListDocuments", () => ({
  useListDocuments: (...args: unknown[]) => mockUseListDocuments(...args),
}));

/* ---- Imports (after mocks) ---- */

import { render, screen, fireEvent } from "@testing-library/react";
import MeridianTileRail from "../MeridianTileRail";

/* ---- Helpers ---- */

const CONVERSATIONS = [
  { id: "c1", title: "Grant partnership", updated_at: "2026-07-14T09:00:00Z" },
  { id: "c2", title: "PRISM review", updated_at: "2026-07-13T09:00:00Z" },
];

function setConversations(list: unknown[]) {
  mockUseAgentConversation.mockReturnValue({
    data: { data: { conversations: list } },
    isLoading: false,
  });
}

function setDocuments(files: unknown[]) {
  mockUseListDocuments.mockReturnValue({
    data: { date_groups: files.length ? [{ files }] : [] },
    isLoading: false,
  });
}

/* ---- Tests ---- */

describe("MeridianTileRail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    setConversations(CONVERSATIONS);
    setDocuments([{ id: "d1", filename: "handbook.pdf", file_type: "pdf" }]);
  });

  it("renders all five collapsible tiles", () => {
    render(<MeridianTileRail />);
    expect(screen.getByTestId("meridian-tile-rail")).toBeInTheDocument();
    for (const id of ["active", "history", "last5", "projects", "knowledge"]) {
      expect(screen.getByTestId(`rail-toggle-${id}`)).toBeInTheDocument();
    }
  });

  it("lists conversations under Active Sessions", () => {
    render(<MeridianTileRail />);
    // c1 appears in both Active Sessions and Last 5 Chats (both open by default).
    expect(screen.getAllByTestId("rail-conv-c1").length).toBeGreaterThan(0);
  });

  it("toggling History opens its body and persists to localStorage", () => {
    render(<MeridianTileRail />);
    // History defaults collapsed.
    expect(screen.queryByTestId("rail-body-history")).toBeNull();
    fireEvent.click(screen.getByTestId("rail-toggle-history"));
    expect(screen.getByTestId("rail-body-history")).toBeInTheDocument();
    expect(localStorage.getItem("meridian:tiles:v2")).toContain('"history":true');
  });

  it("adding a local project appends a row and persists it", () => {
    render(<MeridianTileRail />);
    const input = screen.getByTestId("rail-project-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Board deck" } });
    fireEvent.click(screen.getByTestId("rail-project-add"));
    expect(screen.getByText("Board deck")).toBeInTheDocument();
    expect(localStorage.getItem("meridian:projects:v2")).toContain("Board deck");
  });

  it("fires onSelectConversation when a row is clicked", () => {
    const onSelect = jest.fn();
    render(<MeridianTileRail onSelectConversation={onSelect} />);
    fireEvent.click(screen.getAllByTestId("rail-conv-c1")[0]);
    expect(onSelect).toHaveBeenCalledWith("c1");
  });

  it("shows an empty state under Knowledge when there are no documents", () => {
    setDocuments([]);
    render(<MeridianTileRail />);
    expect(screen.getByText(/no documents uploaded yet/i)).toBeInTheDocument();
  });
});

// The tiles moved out of the left rail into a dropdown row under the agent
// names on Meridian Chat (2026-07-28). Same tiles, same state, same test ids —
// only the arrangement differs.
describe("MeridianTileRail — horizontal orientation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    setConversations(CONVERSATIONS);
    setDocuments([{ id: "d1", filename: "handbook.pdf", file_type: "pdf" }]);
  });

  it("still renders all five triggers, marked horizontal", () => {
    render(<MeridianTileRail orientation="horizontal" />);
    expect(screen.getByTestId("meridian-tile-rail")).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );
    for (const id of ["active", "history", "last5", "projects", "knowledge"]) {
      expect(screen.getByTestId(`rail-toggle-${id}`)).toBeInTheDocument();
    }
  });

  it("starts with every tile CLOSED, ignoring the stored open state", () => {
    // Five popovers open at once would blanket the page, so the horizontal row
    // overrides the remembered state — which the vertical rail still honours.
    localStorage.setItem("meridian:tiles:v2", JSON.stringify({ active: true, last5: true }));
    render(<MeridianTileRail orientation="horizontal" />);
    for (const id of ["active", "history", "last5", "projects", "knowledge"]) {
      expect(screen.queryByTestId(`rail-body-${id}`)).toBeNull();
      expect(screen.getByTestId(`rail-toggle-${id}`)).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("opens a tile's body on click and still reaches its conversations", () => {
    render(<MeridianTileRail orientation="horizontal" />);
    fireEvent.click(screen.getByTestId("rail-toggle-active"));
    expect(screen.getByTestId("rail-body-active")).toBeInTheDocument();
    expect(screen.getAllByTestId("rail-conv-c1").length).toBeGreaterThan(0);
  });

  it("selecting a conversation from an open dropdown still fires the callback", () => {
    const onSelect = jest.fn();
    render(<MeridianTileRail orientation="horizontal" onSelectConversation={onSelect} />);
    fireEvent.click(screen.getByTestId("rail-toggle-last5"));
    fireEvent.click(screen.getAllByTestId("rail-conv-c1")[0]);
    expect(onSelect).toHaveBeenCalledWith("c1");
  });

  it("the vertical rail keeps honouring the stored open state", () => {
    localStorage.setItem("meridian:tiles:v2", JSON.stringify({ history: true }));
    render(<MeridianTileRail />);
    expect(screen.getByTestId("rail-body-history")).toBeInTheDocument();
  });

  // 2026-07-31 — `tiles` narrows the rail so Meridian's header can show
  // Projects only, inline among the other header buttons, without duplicating
  // the tile's implementation.
  describe("tiles filter", () => {
    it("renders only the named tiles", () => {
      render(<MeridianTileRail orientation="horizontal" tiles={["projects"]} />);
      expect(screen.getByText(/projects/i)).toBeInTheDocument();
      expect(screen.queryByText(/active sessions/i)).toBeNull();
      expect(screen.queryByText(/last 5/i)).toBeNull();
      expect(screen.queryByText(/knowledge/i)).toBeNull();
    });

    it("renders all five when the prop is omitted", () => {
      render(<MeridianTileRail orientation="horizontal" />);
      expect(screen.getByText(/active sessions/i)).toBeInTheDocument();
      expect(screen.getByText(/projects/i)).toBeInTheDocument();
      expect(screen.getByText(/knowledge/i)).toBeInTheDocument();
    });
  });
});

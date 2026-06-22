/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, within } from "@testing-library/react";

const mockUseAgentConversation = jest.fn();
const mockUseListDocuments = jest.fn();
const mockUseProjects = jest.fn();
const mockMutate = jest.fn();

jest.mock("@/hooks/agents/useAgentConversation", () => ({
  useAgentConversation: (...args: unknown[]) => mockUseAgentConversation(...args),
}));
jest.mock("@/hooks/documents/useListDocuments", () => ({
  useListDocuments: (...args: unknown[]) => mockUseListDocuments(...args),
}));
jest.mock("@/hooks/projects/useProjects", () => ({
  useProjects: () => mockUseProjects(),
  useUpdateProjectInstructions: () => ({ mutate: mockMutate }),
}));

import SixTileRail from "@/components/meridian/SixTileRail";

const CONVERSATIONS = {
  data: {
    conversations: [
      { id: "c1", title: "Rachel Grance analysis", updated_at: "2026-06-21T10:00:00Z" },
      { id: "c2", title: "Q3 manager readout", updated_at: "2026-06-20T10:00:00Z" },
      { id: "c3", title: "Career detour", updated_at: "2026-06-19T10:00:00Z" },
      { id: "c4", title: "FERPA review", updated_at: "2026-06-18T10:00:00Z" },
    ],
  },
};

const PROJECTS = [
  { id: "grance", name: "Grance partnership", description: "Diligence", instructions: "Be balanced." },
  { id: "fafsa", name: "FAFSA outreach", description: "Comms" },
];

const DOCS = {
  date_groups: [{ files: [{ id: "d1", filename: "LOI_v3.pdf", file_type: "pdf" }] }],
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockUseAgentConversation.mockReturnValue({ data: CONVERSATIONS, isLoading: false });
  mockUseListDocuments.mockReturnValue({ data: DOCS, isLoading: false });
  mockUseProjects.mockReturnValue({ data: PROJECTS, isLoading: false });
});

describe("SixTileRail", () => {
  it("renders all six tiles", () => {
    render(<SixTileRail />);
    expect(screen.getByText("Active sessions")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Last 5 chats")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Instructions")).toBeInTheDocument();
    expect(screen.getByText("Knowledge")).toBeInTheDocument();
  });

  it("opens Active but collapses History by default", () => {
    render(<SixTileRail />);
    expect(screen.getByTestId("rail-body-active")).toBeInTheDocument();
    expect(screen.queryByTestId("rail-body-history")).not.toBeInTheDocument();
  });

  it("binds Active sessions to conversation data (top 3)", () => {
    render(<SixTileRail />);
    const body = screen.getByTestId("rail-body-active");
    expect(body).toHaveTextContent("Rachel Grance analysis");
    expect(body).toHaveTextContent("Q3 manager readout");
    // Only 3 active rows even though 4 conversations exist
    expect(body.querySelectorAll('[data-testid^="rail-conv-"]')).toHaveLength(3);
  });

  it("selecting a conversation fires onSelectConversation", () => {
    const onSelect = jest.fn();
    render(<SixTileRail onSelectConversation={onSelect} />);
    // c1 appears in both Active and Last 5 tiles; scope to Active.
    const activeBody = screen.getByTestId("rail-body-active");
    fireEvent.click(within(activeBody).getByTestId("rail-conv-c1"));
    expect(onSelect).toHaveBeenCalledWith("c1");
  });

  it("persists tile open/closed state to localStorage", () => {
    render(<SixTileRail />);
    fireEvent.click(screen.getByTestId("rail-toggle-active"));
    const stored = JSON.parse(localStorage.getItem("meridian:tiles") || "{}");
    expect(stored.active).toBe(false);
  });

  it("Save is disabled until Instructions are edited, then calls the mutation", () => {
    render(<SixTileRail />);
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByTestId("rail-instructions-text"), {
      target: { value: "New guidance" },
    });
    expect(save).not.toBeDisabled();
    fireEvent.click(save);
    expect(mockMutate).toHaveBeenCalledWith(
      { projectId: "grance", instructions: "New guidance" },
      expect.any(Object),
    );
  });

  it("renders uploaded documents in the Knowledge tile", () => {
    render(<SixTileRail />);
    expect(screen.getByTestId("rail-body-knowledge")).toHaveTextContent("LOI_v3.pdf");
  });
});

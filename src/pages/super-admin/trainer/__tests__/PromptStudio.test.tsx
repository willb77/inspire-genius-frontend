import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PromptStudio from "../PromptStudio";

/* ── Mocks ─────────────────────────────────────────────────────── */

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="sa-layout">{children}</div>,
}));

const mockCreatePrompt = { mutate: jest.fn(), isPending: false };
const mockPublishPrompt = { mutate: jest.fn(), isPending: false };

const mockVersions = [
  { version: 3, status: "active", token_count: 500, created_at: "2026-04-01T00:00:00Z" },
  { version: 2, status: "archived", token_count: 400, created_at: "2026-03-15T00:00:00Z" },
  { version: 1, status: "archived", token_count: 300, created_at: "2026-03-01T00:00:00Z" },
];

jest.mock("@/hooks/trainer/useTrainer", () => ({
  useActivePrompt: () => ({
    data: { data: { prompt_text: "You are a helpful coaching agent.", version: 3, status: "active" } },
  }),
  usePromptVersions: () => ({
    data: { data: mockVersions },
  }),
  useCreatePrompt: () => mockCreatePrompt,
  usePublishPrompt: () => mockPublishPrompt,
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { email: "admin@test.com", role: "super-admin" },
    isAuthenticated: true,
  }),
}));

/* ── Helpers ───────────────────────────────────────────────────── */

function renderComponent(agentId = "agent-1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/super-admin/agent-trainer/${agentId}/prompt`]}>
        <Routes>
          <Route path="/super-admin/agent-trainer/:agentId/prompt" element={<PromptStudio />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("PromptStudio", () => {
  beforeEach(() => {
    mockCreatePrompt.mutate.mockClear();
    mockPublishPrompt.mutate.mockClear();
  });

  it("renders the prompt studio header with agent id", () => {
    renderComponent();
    expect(screen.getByText(/Prompt Studio — agent-1/)).toBeInTheDocument();
  });

  it("shows token count badge", () => {
    renderComponent();
    // default text "You are a helpful coaching agent." ~ 8 tokens
    expect(screen.getByText(/tokens/)).toBeInTheDocument();
  });

  it("displays the active prompt text in the editor textarea", () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText("Enter your system prompt here...");
    expect(textarea).toHaveValue("You are a helpful coaching agent.");
  });

  it("shows Save Draft and Publish buttons", () => {
    renderComponent();
    expect(screen.getByText("Save Draft")).toBeInTheDocument();
    expect(screen.getByText("Publish")).toBeInTheDocument();
  });

  it("calls createPrompt on Save Draft click", () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText("Enter your system prompt here...");
    fireEvent.change(textarea, { target: { value: "New prompt text" } });
    fireEvent.click(screen.getByText("Save Draft"));
    expect(mockCreatePrompt.mutate).toHaveBeenCalledWith({
      agentId: "agent-1",
      payload: { prompt_text: "New prompt text" },
    });
  });

  it("calls publishPrompt on Publish click", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Publish"));
    expect(mockPublishPrompt.mutate).toHaveBeenCalledWith({
      agentId: "agent-1",
      version: 3,
    });
  });

  it("renders tab list with Editor, Sections, History", () => {
    renderComponent();
    expect(screen.getByText("Editor")).toBeInTheDocument();
    expect(screen.getByText("Sections")).toBeInTheDocument();
    expect(screen.getByText(/History/)).toBeInTheDocument();
  });

  it("shows Live Preview panel", () => {
    renderComponent();
    expect(screen.getByText("Live Preview")).toBeInTheDocument();
    expect(screen.getByText("Send Test Message")).toBeInTheDocument();
  });

  it("has a History tab showing version count", () => {
    renderComponent();
    const historyTab = screen.getByRole("tab", { name: /History \(3\)/ });
    expect(historyTab).toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import DevConsolePanel from "@/pages/super-admin/dev-console/DevConsolePanel";
import * as svc from "@/services/dev-console/devConsole.service";
import { ME, REPOS, SHA, apiError, makeJob, networkError } from "@/test/devConsoleFixtures";
import type { DevConsoleMe, JobEvent } from "@/types/devConsole";

jest.mock("react-i18next", () => jest.requireActual("@/test/devConsoleI18nMock").reactI18nextMock);
jest.mock("@/services/dev-console/devConsole.service");
jest.mock("@/lib/devConsoleApi", () => ({ isDevConsoleConfigured: () => true }));
// react-markdown ships ESM that Jest does not transform; the answer only needs its text on screen.
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));
jest.mock("remark-gfm", () => ({ __esModule: true, default: () => undefined }));

const m = svc as jest.Mocked<typeof svc>;

const TOOL: JobEvent = { seq: 1, ts: "t", type: "tool", tool: "Grep", summary: "Searching for 'resolver'" };
const STEP: JobEvent = { seq: 2, ts: "t", type: "step", step: 2, summary: "Reading the module" };
const BLOCKED: JobEvent = { seq: 3, ts: "t", type: "blocked", tool: "Bash", reason: "Shell is disabled in read-only mode." };
const COST: JobEvent = { seq: 4, ts: "t", type: "cost", cost_usd: 0.07 };
const ANSWER: JobEvent = {
  seq: 5,
  ts: "t",
  type: "answer",
  markdown: "The resolver lives in the memory package.",
  citations: [
    {
      path: "services/agent-engine/app/memory/resolver.py",
      line_start: 120,
      line_end: 162,
      url: `https://github.com/example-org/repo-private/blob/${SHA}/services/agent-engine/app/memory/resolver.py#L120-L162`,
    },
    { path: "docs/evil.md", line_start: 1, line_end: 1, url: "javascript:alert(1)" },
  ],
};

function renderPanel(me: DevConsoleMe = ME) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DevConsolePanel me={me} />
    </QueryClientProvider>
  );
}

async function ask(text = "where is the resolver?") {
  const box = await screen.findByRole("textbox", { name: "Question" });
  await userEvent.type(box, text);
  await userEvent.click(screen.getByRole("button", { name: "Send" }));
}

beforeEach(() => {
  jest.clearAllMocks();
  m.listRepos.mockResolvedValue(REPOS);
  m.listSessions.mockResolvedValue([]);
  m.getSession.mockResolvedValue({ session_id: "x", jobs: [] });
  m.listConsoleAdmins.mockResolvedValue([]);
  m.startJob.mockResolvedValue({ job_id: makeJob("queued").job_id, session_id: makeJob("queued").session_id, status: "queued" });
});

describe("DevConsolePanel — asking", () => {
  it("shows the budget and the server's repo list", async () => {
    renderPanel();
    expect(screen.getByText(/Today: \$0\.42 of \$5\.00/)).toBeInTheDocument();
    const repo = await screen.findByRole("combobox", { name: "Repository" });
    expect(within(repo).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "example-org/repo-private",
      "example-org/repo-public",
    ]);
    const model = screen.getByRole("combobox", { name: "Model" });
    expect(within(model).getAllByRole("option").map((o) => o.textContent)).toEqual(["Auto", "Haiku", "Sonnet", "Opus"]);
  });

  it("sends a job with the contract body and renders the full event stream", async () => {
    m.getJob.mockResolvedValue(makeJob("complete", [TOOL, STEP, BLOCKED, COST, ANSWER]));
    renderPanel();
    await ask();
    await waitFor(() =>
      expect(m.startJob).toHaveBeenCalledWith({
        repo: "repo-private",
        prompt: "where is the resolver?",
        model: "auto",
        ref: "development",
        session_id: null,
        ticket_id: null,
      })
    );
    expect(await screen.findByText("The resolver lives in the memory package.")).toBeInTheDocument();
    expect(screen.getByText("Grep")).toBeInTheDocument();
    expect(screen.getByText(/Searching for 'resolver'/)).toBeInTheDocument();
    expect(screen.getByText(/Step 2/)).toBeInTheDocument();
    // blocked is ALWAYS visible
    expect(screen.getByText("Blocked: Bash")).toBeInTheDocument();
    expect(screen.getByText("Shell is disabled in read-only mode.")).toBeInTheDocument();
    expect(screen.getByText("Cost so far: $0.07")).toBeInTheDocument();
    // citation is a link at the commit SHA; a non-GitHub URL is text only
    const link = screen.getByRole("link", { name: "services/agent-engine/app/memory/resolver.py#L120-L162" });
    expect(link).toHaveAttribute("href", expect.stringContaining(`/blob/${SHA}/`));
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("docs/evil.md#L1")).not.toHaveAttribute("href");
    expect(screen.queryByRole("link", { name: "docs/evil.md#L1" })).not.toBeInTheDocument();
    // step counter, cost, commit
    expect(screen.getByText("Step 4 of 12")).toBeInTheDocument();
    expect(screen.getByText(`at ${SHA.slice(0, 10)}`)).toBeInTheDocument();
    // the next question continues the same session
    m.getJob.mockResolvedValue(makeJob("complete", [ANSWER]));
    m.startJob.mockResolvedValueOnce({ job_id: "job-0002", session_id: makeJob("queued").session_id, status: "queued" });
    await ask("and who calls it?");
    await waitFor(() => expect(m.startJob).toHaveBeenCalledTimes(2));
    expect(m.startJob.mock.calls[1][0].session_id).toBe(makeJob("queued").session_id);
  });

  it("a job whose only outcome is a block shows the block — never an empty answer", async () => {
    m.getJob.mockResolvedValue(makeJob("complete", [BLOCKED]));
    renderPanel();
    await ask();
    expect(await screen.findByText("Blocked: Bash")).toBeInTheDocument();
    expect(
      screen.getByText("The job ended on a blocked action, shown above. No answer was produced.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Answer")).not.toBeInTheDocument();
  });

  it("says so when a job finishes with neither answer nor block", async () => {
    m.getJob.mockResolvedValue(makeJob("complete", [TOOL]));
    renderPanel();
    await ask();
    expect(await screen.findByText("The job finished without an answer.")).toBeInTheDocument();
  });

  it("renders an error event from the job as an alert", async () => {
    m.getJob.mockResolvedValue(
      makeJob("error", [{ seq: 1, ts: "t", type: "error", code: "RUNNER", message: "The runner timed out." }])
    );
    renderPanel();
    await ask();
    expect(await screen.findByRole("alert")).toHaveTextContent("The runner timed out.");
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders the transport error when polling the job fails", async () => {
    m.getJob.mockRejectedValue(networkError());
    renderPanel();
    await ask();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the console. Check your connection and try again."
    );
  });

  it("pauses at the step cap, then continues; cancel is offered", async () => {
    m.getJob.mockResolvedValue(makeJob("awaiting_continue", [TOOL], { steps: 12 }));
    m.continueJob.mockResolvedValue();
    m.cancelJob.mockResolvedValue();
    renderPanel();
    await ask();
    expect(await screen.findByText(/Paused at the step cap \(12 steps\)/)).toBeInTheDocument();
    m.getJob.mockResolvedValue(makeJob("complete", [TOOL, ANSWER]));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(m.continueJob).toHaveBeenCalledWith(makeJob("queued").job_id));
    expect(await screen.findByText("The resolver lives in the memory package.")).toBeInTheDocument();
  });

  it("cancels a running job", async () => {
    m.getJob.mockResolvedValue(makeJob("running", [TOOL]));
    m.cancelJob.mockResolvedValue();
    const { unmount } = renderPanel();
    await ask();
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(m.cancelJob).toHaveBeenCalledWith(makeJob("queued").job_id));
    // Send stays disabled while a job is live.
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    unmount();
  });

  it("inserts a shortcut at the start of the prompt", async () => {
    renderPanel();
    const box = await screen.findByRole("textbox", { name: "Question" });
    await userEvent.type(box, "the resolver");
    await userEvent.click(screen.getByRole("button", { name: "/where" }));
    expect(box).toHaveValue("/where the resolver");
    await userEvent.click(screen.getByRole("button", { name: "/history" }));
    expect(box).toHaveValue("/history the resolver");
  });

  it("validates an empty prompt without calling the server", async () => {
    renderPanel();
    await screen.findByRole("textbox", { name: "Question" });
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a question.");
    expect(m.startJob).not.toHaveBeenCalled();
  });

  it("is switched off when /me says enabled: false", async () => {
    renderPanel({ ...ME, enabled: false });
    expect(screen.getByRole("alert")).toHaveTextContent("The console is switched off.");
    expect(await screen.findByRole("button", { name: "Send" })).toBeDisabled();
  });
});

describe("DevConsolePanel — every contract failure is rendered", () => {
  it.each([
    [404, "NOT_FOUND", undefined, "Not found."],
    [422, "VALIDATION", "prompt: must be 1-8000 characters", "prompt: must be 1-8000 characters"],
    [422, "PROMPT_CONTAINS_SECRET", undefined, "Your prompt looks like it contains a key or token. Remove it and resend."],
    [429, "BUSY", undefined, "One job at a time."],
    [429, "BUDGET_EXCEEDED", undefined, "Today's budget is used ($0.42 of $5.00)."],
    [503, "CONSOLE_DISABLED", undefined, "The console is switched off."],
    [403, "OWNER_ONLY", undefined, "Only the owner can manage access."],
  ])("%s %s → role=alert", async (status, code, description, text) => {
    m.startJob.mockRejectedValue(apiError(status, code, description));
    renderPanel();
    await ask();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(text);
    expect(alert).toHaveAttribute("data-code", code);
    // a failed send keeps the prompt so it can be fixed and resent
    expect(screen.getByRole("textbox", { name: "Question" })).toHaveValue("where is the resolver?");
  });

  it("409 NOT_AWAITING_CONTINUE is an inline notice", async () => {
    m.getJob.mockResolvedValue(makeJob("awaiting_continue", [TOOL]));
    m.continueJob.mockRejectedValue(apiError(409, "NOT_AWAITING_CONTINUE"));
    renderPanel();
    await ask();
    await userEvent.click(await screen.findByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This job is not paused at the step cap, so there is nothing to continue."
    );
  });

  it.each(["NOT_SUPER_ADMIN", "DEV_CONSOLE_FORBIDDEN"])("403 %s renders nothing (the tab hides)", async (code) => {
    m.startJob.mockRejectedValue(apiError(403, code));
    renderPanel();
    await ask();
    await waitFor(() => expect(m.startJob).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders a repo-list failure", async () => {
    m.listRepos.mockRejectedValue(apiError(503, "CONSOLE_DISABLED"));
    renderPanel();
    expect(await screen.findByRole("alert")).toHaveTextContent("The console is switched off.");
  });
});

describe("DevConsolePanel — sessions, tickets and access", () => {
  it("opens a past session, shows its jobs, and attaches it to a ticket", async () => {
    m.listSessions.mockResolvedValue([
      {
        session_id: "session-b2",
        repo: "repo-private",
        title: "Where is the resolver",
        created_at: "2026-10-03T10:00:00Z",
        last_at: "2026-10-03T10:05:00Z",
        jobs: 2,
        cost_usd: 0.12,
        ticket_id: null,
      },
    ]);
    m.getSession.mockResolvedValue({
      session_id: "session-b2",
      jobs: [makeJob("complete", [BLOCKED], { job_id: "past-job" })],
    });
    m.attachSessionToTicket.mockResolvedValue();
    renderPanel();
    await userEvent.click(await screen.findByRole("button", { name: /Where is the resolver/ }));
    await waitFor(() => expect(m.getSession).toHaveBeenCalledWith("session-b2"));
    expect(await screen.findByText("Blocked: Bash")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Attach this session to a ticket"), "T-1042");
    await userEvent.click(screen.getByRole("button", { name: "Attach" }));
    await waitFor(() =>
      expect(m.attachSessionToTicket).toHaveBeenCalledWith("session-b2", "T-1042")
    );
    expect(await screen.findByText("Attached to the ticket as an internal note.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "New session" }));
    expect(screen.queryByText("Blocked: Bash")).not.toBeInTheDocument();
  });

  it("shows no access panel to a non-owner", async () => {
    renderPanel();
    await screen.findByRole("textbox", { name: "Question" });
    expect(screen.queryByText("Who can use the console")).not.toBeInTheDocument();
    expect(m.listConsoleAdmins).not.toHaveBeenCalled();
  });

  it("lets the owner grant and revoke, and validates the email", async () => {
    m.listConsoleAdmins.mockResolvedValue([{ email: "test@example.com" }]);
    m.grantConsoleAdmin.mockResolvedValue();
    m.revokeConsoleAdmin.mockResolvedValue();
    renderPanel({ ...ME, owner: true });
    expect(await screen.findByText("test@example.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(m.revokeConsoleAdmin).toHaveBeenCalledWith("test@example.com"));

    const email = screen.getByLabelText("Email");
    await userEvent.type(email, "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Grant" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(m.grantConsoleAdmin).not.toHaveBeenCalled();

    await userEvent.clear(email);
    await userEvent.type(email, "test@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Grant" }));
    await waitFor(() => expect(m.grantConsoleAdmin).toHaveBeenCalledWith("test@example.com"));
  });

  it("renders OWNER_ONLY from a grant", async () => {
    m.grantConsoleAdmin.mockRejectedValue(apiError(403, "OWNER_ONLY"));
    renderPanel({ ...ME, owner: true });
    await userEvent.type(await screen.findByLabelText("Email"), "test@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Grant" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Only the owner can manage access.");
  });
});

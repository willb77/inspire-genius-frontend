/**
 * @jest-environment jsdom
 *
 * TDS F-W7-1 Part B — the person removes one of their own results.
 *
 * DELETE /v1/profile/me/assessments/{id} is soft on the server (monorepo
 * #2203). These tests try to disprove that: Remove shows only where the server
 * would allow it; nothing is sent without a confirm; the right id is sent and
 * the card refreshes; a refusal is shown, never swallowed; and a removed entry
 * stops counting as "earlier".
 */
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";

import AssessmentsOnFile from "@/components/shared/settings/AssessmentsOnFile";
import {
  activeEarlierCount,
  currentEntry,
  isRemovable,
  removeErrorInfo,
} from "@/components/shared/settings/onFileHelpers";
import {
  getMyProfile,
  listAssessments,
  removeAssessment,
} from "@/services/profile/profile";
import type {
  AssessmentHistoryItem,
  ProfileAssessmentView,
  ProfileMe,
} from "@/types/profile/profile-types";

jest.mock("@/services/profile/profile", () => ({
  getMyProfile: jest.fn(),
  listAssessments: jest.fn(),
  removeAssessment: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const view = (framework: string, source: string, at: string): ProfileAssessmentView => ({
  framework,
  assessed_at: at,
  source,
  top_scores: [{ category: "X", dimension: "D", score_numeric: 50 }],
});

const row = (
  id: string,
  framework: string,
  source: string,
  at: string,
  is_authoritative = true,
): AssessmentHistoryItem => ({ id, framework, assessed_at: at, source, is_authoritative, notes: null });

// W7's two CLIFTON rows (newer from a report, older entered), a DISC the person
// entered, and an MBTI a coach imported.
let HISTORY: Record<string, AssessmentHistoryItem[]>;

beforeEach(() => {
  jest.clearAllMocks();
  HISTORY = {
    CLIFTON: [
      row("c-new", "CLIFTON", "file_upload", "2026-11-25T15:41:00Z"),
      row("c-old", "CLIFTON", "user_input", "2026-11-25T15:40:00Z"),
    ],
    DISC: [row("d-1", "DISC", "user_input", "2026-10-01T00:00:00Z")],
    MBTI: [row("m-1", "MBTI", "honor_coach_import", "2026-09-01T00:00:00Z")],
  };
  (getMyProfile as jest.Mock).mockResolvedValue({
    user_id: "u",
    facts: [],
    loaded_frameworks: [],
    assessments: [
      view("CLIFTON", "file_upload", "2026-11-25T15:41:00Z"),
      view("DISC", "user_input", "2026-10-01T00:00:00Z"),
      view("MBTI", "honor_coach_import", "2026-09-01T00:00:00Z"),
    ],
  } as ProfileMe);
  (listAssessments as jest.Mock).mockImplementation(({ framework }: { framework?: string }) => {
    const items = HISTORY[framework ?? ""] ?? [];
    return Promise.resolve({ items, total: items.length, limit: 200, offset: 0 });
  });
});

function wrap(ui: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function axiosError(status: number, detail?: string) {
  return Object.assign(new Error(`HTTP ${status}`), {
    response: { status, data: detail === undefined ? {} : { detail } },
  });
}

async function openRemove(key: string) {
  const line = await screen.findByTestId(`on-file-remove-${key}`);
  fireEvent.click(within(line).getByRole("button", { name: /remove your/i }));
  return screen.findByTestId("remove-assessment-dialog");
}

// ── the helpers mirror the server's guards ───────────────────────────────────

test("removable: the person's own entered or uploaded entry that still counts, never PRISM", () => {
  const at = "2026-01-01T00:00:00Z";
  expect(isRemovable(row("a", "DISC", "user_input", at))).toBe(true);
  expect(isRemovable(row("a", "CLIFTON", "file_upload", at))).toBe(true);
  expect(isRemovable(row("a", "MBTI", "honor_coach_import", at))).toBe(false);
  expect(isRemovable(row("a", "DISC", "csv_upload", at))).toBe(false);
  expect(isRemovable(row("a", "PRISM", "user_input", at))).toBe(false);
  expect(isRemovable(row("a", "prism", "file_upload", at))).toBe(false);
  expect(isRemovable(row("a", "DISC", "user_input", at, false))).toBe(false);
  expect(isRemovable(row("", "DISC", "user_input", at))).toBe(false);
  expect(isRemovable(undefined)).toBe(false);
});

test("the current entry is the latest that still counts; a removed one is skipped", () => {
  const items = [
    row("old", "CLIFTON", "user_input", "2026-11-01T00:00:00Z"),
    row("gone", "CLIFTON", "file_upload", "2026-11-03T00:00:00Z", false),
    row("mid", "CLIFTON", "user_input", "2026-11-02T00:00:00Z"),
    row("other", "DISC", "user_input", "2026-12-01T00:00:00Z"),
  ];
  expect(currentEntry(items, "clifton")?.id).toBe("mid");
  expect(activeEarlierCount(items, "CLIFTON")).toBe(1);
  expect(currentEntry([], "CLIFTON")).toBeUndefined();
});

test("removeErrorInfo reads the status and the server's detail, and nothing else", () => {
  expect(removeErrorInfo(axiosError(403, "Only results you entered"))).toEqual({
    status: 403,
    detail: "Only results you entered",
  });
  expect(removeErrorInfo(axiosError(404))).toEqual({ status: 404, detail: undefined });
  expect(removeErrorInfo(new Error("network"))).toEqual({ status: undefined, detail: undefined });
});

// ── the button ───────────────────────────────────────────────────────────────

test("Remove shows on lines the person made, not on a coach's import", async () => {
  wrap(<AssessmentsOnFile />);
  expect(await screen.findByTestId("on-file-remove-CLIFTON")).toBeInTheDocument();
  expect(await screen.findByTestId("on-file-remove-DISC")).toBeInTheDocument();
  await screen.findByTestId("on-file-MBTI");
  await waitFor(() => expect(listAssessments).toHaveBeenCalledWith({ framework: "MBTI", limit: 200, offset: 0 }));
  expect(screen.queryByTestId("on-file-remove-MBTI")).not.toBeInTheDocument();
});

test("no Remove while the history is unreadable (no id to send)", async () => {
  (listAssessments as jest.Mock).mockRejectedValue(new Error("boom"));
  wrap(<AssessmentsOnFile />);
  await screen.findByTestId("on-file-CLIFTON");
  await waitFor(() => expect(listAssessments).toHaveBeenCalled());
  expect(screen.queryByTestId("on-file-remove-CLIFTON")).not.toBeInTheDocument();
});

test("nothing is sent until the person confirms; Cancel sends nothing", async () => {
  wrap(<AssessmentsOnFile />);
  const dialog = await openRemove("CLIFTON");
  expect(dialog).toHaveTextContent(/stop being used/i);
  expect(dialog).toHaveTextContent(/earlier CliftonStrengths result.*becomes your current result/i);
  expect(removeAssessment).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));
  await waitFor(() => expect(screen.queryByTestId("remove-assessment-dialog")).not.toBeInTheDocument());
  expect(removeAssessment).not.toHaveBeenCalled();
});

test("confirm sends the CURRENT entry's id, toasts, and refreshes the card", async () => {
  (removeAssessment as jest.Mock).mockImplementation(async (id: string) => {
    HISTORY.CLIFTON = HISTORY.CLIFTON.map((r) => (r.id === id ? { ...r, is_authoritative: false } : r));
    return { ...HISTORY.CLIFTON[0] };
  });
  wrap(<AssessmentsOnFile />);
  expect(await screen.findByTestId("on-file-earlier-CLIFTON")).toHaveTextContent("+1 earlier");
  const calls = (getMyProfile as jest.Mock).mock.calls.length;
  const dialog = await openRemove("CLIFTON");
  fireEvent.click(within(dialog).getByRole("button", { name: /^remove$/i }));
  await waitFor(() => expect(removeAssessment).toHaveBeenCalledWith("c-new"));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith("CliftonStrengths result removed."));
  await waitFor(() => expect(screen.queryByTestId("remove-assessment-dialog")).not.toBeInTheDocument());
  await waitFor(() => expect((getMyProfile as jest.Mock).mock.calls.length).toBeGreaterThan(calls));
  // W7's dev check: the removed newer row no longer counts as "earlier".
  await waitFor(() => expect(screen.queryByTestId("on-file-earlier-CLIFTON")).not.toBeInTheDocument());
});

test("a refusal shows the server's reason and keeps the dialog open", async () => {
  (removeAssessment as jest.Mock).mockRejectedValue(
    axiosError(403, "Only results you entered or uploaded yourself can be removed"),
  );
  wrap(<AssessmentsOnFile />);
  const dialog = await openRemove("DISC");
  fireEvent.click(within(dialog).getByRole("button", { name: /^remove$/i }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "Only results you entered or uploaded yourself can be removed",
  );
  expect(screen.getByTestId("remove-assessment-dialog")).toBeInTheDocument();
  expect(toast.success).not.toHaveBeenCalled();
});

test("a failure with no reason still says it failed", async () => {
  (removeAssessment as jest.Mock).mockRejectedValue(axiosError(404));
  wrap(<AssessmentsOnFile />);
  const dialog = await openRemove("DISC");
  fireEvent.click(within(dialog).getByRole("button", { name: /^remove$/i }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(/could not remove this result/i);
});

test("already removed (409) says so, closes, and refreshes", async () => {
  (removeAssessment as jest.Mock).mockRejectedValue(axiosError(409, "This result has already been removed"));
  wrap(<AssessmentsOnFile />);
  await screen.findByTestId("on-file-remove-DISC");
  const calls = (listAssessments as jest.Mock).mock.calls.length;
  const dialog = await openRemove("DISC");
  fireEvent.click(within(dialog).getByRole("button", { name: /^remove$/i }));
  await waitFor(() => expect(toast.info).toHaveBeenCalledWith("That result had already been removed."));
  await waitFor(() => expect(screen.queryByTestId("remove-assessment-dialog")).not.toBeInTheDocument());
  await waitFor(() => expect((listAssessments as jest.Mock).mock.calls.length).toBeGreaterThan(calls));
});

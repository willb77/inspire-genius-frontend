/**
 * @jest-environment jsdom
 *
 * TDS F-W7-1 — Settings → Other Assessments shows what is on file.
 *
 * Walk W7 saved a CliftonStrengths top five twice and the card never showed
 * either one: it made no read. These tests try to disprove that the card now
 * lists the current result per framework, counts the earlier entries, tells
 * the person before a save replaces one, says so when the read fails (never
 * "nothing on file"), and toasts the import save even if the dialog is gone.
 */
import type { ReactNode } from "react";
import { act, render, renderHook, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";

import AssessmentsOnFile from "@/components/shared/settings/AssessmentsOnFile";
import SupersedeNotice from "@/components/shared/settings/SupersedeNotice";
import UploadReportDialog from "@/components/shared/settings/UploadReportDialog";
import {
  activeEarlierCount,
  findOnFile,
  onFileAssessments,
  resultText,
  sourceKind,
} from "@/components/shared/settings/onFileHelpers";
import { useConfirmImportAssessment } from "@/hooks/profile/useProfile";
import {
  confirmImportAssessment,
  getMyProfile,
  listAssessments,
  previewImportAssessment,
} from "@/services/profile/profile";
import type { ProfileAssessmentView, ProfileMe } from "@/types/profile/profile-types";

jest.mock("@/services/profile/profile", () => ({
  createAssessment: jest.fn(),
  previewImportAssessment: jest.fn(),
  confirmImportAssessment: jest.fn(),
  importAssessment: jest.fn(),
  getMyProfile: jest.fn(),
  listAssessments: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const CLIFTON: ProfileAssessmentView = {
  framework: "CLIFTON",
  assessed_at: "2026-11-25T15:41:00Z",
  source: "file_upload",
  top_scores: [
    { category: "Themes", dimension: "Strategic", rank: 3 },
    { category: "Themes", dimension: "Achiever", rank: 1 },
    { category: "Themes", dimension: "Learner", rank: 2 },
    { category: "Themes", dimension: "Focus", rank: 5 },
    { category: "Themes", dimension: "Relator", rank: 4 },
    { category: "Themes", dimension: "Woo", rank: 6 },
  ],
};
const DISC: ProfileAssessmentView = {
  framework: "DISC",
  assessed_at: "2026-10-01T00:00:00Z",
  source: "user_input",
  top_scores: [
    { category: "DISC", dimension: "D", score_numeric: 70 },
    { category: "DISC", dimension: "I", score_numeric: 55.5 },
  ],
};
const MBTI: ProfileAssessmentView = {
  framework: "MBTI",
  assessed_at: "2026-09-01T00:00:00Z",
  source: "honor_coach_import",
  top_scores: [],
  typing: "INTJ",
};
const PRISM: ProfileAssessmentView = {
  framework: "PRISM",
  assessed_at: "2026-08-01T00:00:00Z",
  source: "prism_api",
  top_scores: [{ category: "Behaviour", dimension: "Innovating", score_numeric: 80 }],
};

/** The backend's `items` shape: W7's two CLIFTON rows, one of everything else. */
function historyFor(framework?: string) {
  const row = (id: string, at: string, source = "user_input") => ({
    id, framework: framework ?? "", assessed_at: at, source, is_authoritative: true, notes: null,
  });
  const items =
    framework === "CLIFTON"
      ? [row("c-new", "2026-11-25T15:41:00Z", "file_upload"), row("c-old", "2026-11-25T15:40:00Z")]
      : [row(`${framework}-1`, "2026-10-01T00:00:00Z")];
  return { items, total: items.length, limit: 200, offset: 0 };
}

function profile(assessments: ProfileAssessmentView[]): ProfileMe {
  return { user_id: "u", facts: [], loaded_frameworks: [], assessments };
}

function client(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 }, mutations: { retry: false } },
  });
}

function wrap(ui: ReactNode, qc = client()) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  (getMyProfile as jest.Mock).mockResolvedValue(profile([CLIFTON, PRISM, MBTI, DISC]));
  (listAssessments as jest.Mock).mockImplementation(({ framework }: { framework?: string }) =>
    Promise.resolve(historyFor(framework)),
  );
});

// ── the helpers ──────────────────────────────────────────────────────────────

test("on file: PRISM is left out and the order is DISC, Big Five, MBTI, CliftonStrengths", () => {
  const order = onFileAssessments(profile([CLIFTON, PRISM, MBTI, DISC])).map((a) => a.framework);
  expect(order).toEqual(["DISC", "MBTI", "CLIFTON"]);
  expect(onFileAssessments(undefined)).toEqual([]);
});

test("CliftonStrengths reads as the top five themes in rank order", () => {
  expect(resultText(CLIFTON)).toBe("Achiever, Learner, Strategic, Relator, Focus");
});

test("MBTI reads as its type; DISC as its scores", () => {
  expect(resultText(MBTI)).toBe("INTJ");
  expect(resultText(DISC)).toBe("D 70 · I 55.5");
});

test("source labels: entered, report, anything else neutral", () => {
  expect(sourceKind("user_input")).toBe("entered");
  expect(sourceKind("file_upload")).toBe("report");
  expect(sourceKind("honor_coach_import")).toBe("other");
});

test("earlier = the entries that still count, but the current one", () => {
  const items = historyFor("CLIFTON").items;
  expect(activeEarlierCount(items, "CLIFTON")).toBe(1);
  expect(activeEarlierCount(items.slice(0, 1), "CLIFTON")).toBe(0);
  expect(activeEarlierCount([], "CLIFTON")).toBe(0);
  expect(activeEarlierCount(undefined, "CLIFTON")).toBe(0);
});

test("findOnFile matches the framework case-insensitively and never finds PRISM", () => {
  const p = profile([CLIFTON, PRISM]);
  expect(findOnFile(p, "clifton")?.framework).toBe("CLIFTON");
  expect(findOnFile(p, "PRISM")).toBeUndefined();
  expect(findOnFile(p, "")).toBeUndefined();
});

// ── the list ─────────────────────────────────────────────────────────────────

test("the card lists each current result with its date, source and result", async () => {
  wrap(<AssessmentsOnFile />);
  const clifton = await screen.findByTestId("on-file-CLIFTON");
  expect(within(clifton).getByText("CliftonStrengths")).toBeInTheDocument();
  expect(within(clifton).getByText("Achiever, Learner, Strategic, Relator, Focus")).toBeInTheDocument();
  expect(within(clifton).getByText(/from a report/i)).toBeInTheDocument();
  expect(within(screen.getByTestId("on-file-DISC")).getByText(/entered by you/i)).toBeInTheDocument();
  expect(within(screen.getByTestId("on-file-MBTI")).getByText("INTJ")).toBeInTheDocument();
  expect(screen.queryByTestId("on-file-PRISM")).not.toBeInTheDocument();
});

test("W7's case: two CliftonStrengths entries read as one line with +1 earlier", async () => {
  wrap(<AssessmentsOnFile />);
  expect(await screen.findByTestId("on-file-earlier-CLIFTON")).toHaveTextContent("+1 earlier");
  expect(screen.queryByTestId("on-file-earlier-DISC")).not.toBeInTheDocument();
  expect(listAssessments).toHaveBeenCalledWith({ framework: "CLIFTON", limit: 200, offset: 0 });
});

test("a failed history read shows no earlier count rather than a wrong one", async () => {
  (listAssessments as jest.Mock).mockRejectedValue(new Error("boom"));
  wrap(<AssessmentsOnFile />);
  await screen.findByTestId("on-file-CLIFTON");
  await waitFor(() => expect(listAssessments).toHaveBeenCalled());
  expect(screen.queryByTestId("on-file-earlier-CLIFTON")).not.toBeInTheDocument();
});

test("a failed profile read says so and never says nothing is on file", async () => {
  (getMyProfile as jest.Mock).mockRejectedValue(new Error("boom"));
  wrap(<AssessmentsOnFile />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/could not load your results/i);
  expect(screen.queryByTestId("on-file-empty")).not.toBeInTheDocument();
});

test("nothing on file is said only after a successful empty read", async () => {
  let resolve: (p: ProfileMe) => void = () => undefined;
  (getMyProfile as jest.Mock).mockReturnValue(new Promise<ProfileMe>((r) => (resolve = r)));
  wrap(<AssessmentsOnFile />);
  expect(screen.getByText(/loading your results/i)).toBeInTheDocument();
  expect(screen.queryByTestId("on-file-empty")).not.toBeInTheDocument();
  await act(async () => resolve(profile([PRISM])));
  expect(await screen.findByTestId("on-file-empty")).toBeInTheDocument();
});

// ── the supersede notice ─────────────────────────────────────────────────────

test("a dialog for a framework already on file says the new one becomes current", async () => {
  wrap(<SupersedeNotice framework="CLIFTON" />);
  const note = await screen.findByTestId("supersede-notice");
  expect(note).toHaveTextContent(/already have a CliftonStrengths result from/i);
  expect(note).toHaveTextContent(/2026/);
  expect(note).toHaveTextContent(/earlier one stays in your history/i);
});

test("no notice for a framework not on file, for PRISM, or when the read fails", async () => {
  const { unmount } = wrap(<SupersedeNotice framework="BIG_FIVE" />);
  await waitFor(() => expect(getMyProfile).toHaveBeenCalled());
  await act(async () => undefined);
  expect(screen.queryByTestId("supersede-notice")).not.toBeInTheDocument();
  unmount();
  (getMyProfile as jest.Mock).mockRejectedValue(new Error("boom"));
  wrap(<SupersedeNotice framework="CLIFTON" />);
  await waitFor(() => expect(getMyProfile).toHaveBeenCalledTimes(2));
  await act(async () => undefined);
  expect(screen.queryByTestId("supersede-notice")).not.toBeInTheDocument();
});

test("the upload dialog's notice follows the chosen assessment", async () => {
  wrap(<UploadReportDialog open onOpenChange={jest.fn()} />);
  await waitFor(() => expect(getMyProfile).toHaveBeenCalled());
  expect(screen.queryByTestId("supersede-notice")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^assessment$/i), { target: { value: "CLIFTON" } });
  expect(await screen.findByTestId("supersede-notice")).toHaveTextContent(/CliftonStrengths/);
  fireEvent.change(screen.getByLabelText(/^assessment$/i), { target: { value: "BIG_FIVE" } });
  await waitFor(() => expect(screen.queryByTestId("supersede-notice")).not.toBeInTheDocument());
});

// ── the import toast (O-W7-a) ────────────────────────────────────────────────

async function readAndSave(qcUnmount?: () => void) {
  (previewImportAssessment as jest.Mock).mockResolvedValue({
    framework: "DISC",
    source: "file_upload",
    score_count: 1,
    typing_count: 0,
    dimensions: ["D"],
    scores: [{ category: "DISC", dimension: "D", score_numeric: 80 }],
  });
  fireEvent.change(screen.getByLabelText(/^assessment$/i), { target: { value: "DISC" } });
  fireEvent.change(screen.getByLabelText(/report file/i), {
    target: { files: [new File(["x"], "r.pdf", { type: "application/pdf" })] },
  });
  fireEvent.click(screen.getByRole("button", { name: /read report/i }));
  const save = await screen.findByRole("button", { name: /^save$/i });
  fireEvent.click(save);
  qcUnmount?.();
}

test("the import save shows a toast", async () => {
  (confirmImportAssessment as jest.Mock).mockResolvedValue({ id: "a-1" });
  wrap(<UploadReportDialog open onOpenChange={jest.fn()} />);
  await readAndSave();
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Report saved."));
});

test("the import toast still shows if the dialog unmounts before the save returns", async () => {
  let resolve: (v: unknown) => void = () => undefined;
  (confirmImportAssessment as jest.Mock).mockReturnValue(new Promise((r) => (resolve = r)));
  const { unmount } = wrap(<UploadReportDialog open onOpenChange={jest.fn()} />);
  await readAndSave(unmount);
  await act(async () => resolve({ id: "a-1" }));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Report saved."));
});

test("a confirmed import refreshes the earlier-entry counts too", async () => {
  (confirmImportAssessment as jest.Mock).mockResolvedValue({ id: "a-1" });
  const qc = client();
  const spy = jest.spyOn(qc, "invalidateQueries");
  const { result } = renderHook(() => useConfirmImportAssessment(), {
    wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
  });
  await act(async () => {
    await result.current.mutateAsync({ framework: "DISC", scores: [] });
  });
  expect(spy).toHaveBeenCalledWith({ queryKey: ["profile", "history"] });
  expect(spy).toHaveBeenCalledWith({ queryKey: ["profile", "me"] });
});

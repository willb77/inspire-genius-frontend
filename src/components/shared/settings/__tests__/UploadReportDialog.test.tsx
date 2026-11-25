/**
 * @jest-environment jsdom
 *
 * TDS A1 — "Upload a report": preview (writes nothing) → editable review →
 * confirm with the rows as reviewed. The one-step import is never called.
 */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import UploadReportDialog from "@/components/shared/settings/UploadReportDialog";
import {
  confirmImportAssessment,
  importAssessment,
  previewImportAssessment,
} from "@/services/profile/profile";

jest.mock("@/services/profile/profile", () => ({
  createAssessment: jest.fn(),
  previewImportAssessment: jest.fn(),
  confirmImportAssessment: jest.fn(),
  importAssessment: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const onOpenChange = jest.fn();

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UploadReportDialog open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
}

function chooseAndRead(framework: string, name = "report.pdf") {
  fireEvent.change(screen.getByLabelText(/^assessment$/i), { target: { value: framework } });
  const file = new File(["x"], name, { type: "application/pdf" });
  fireEvent.change(screen.getByLabelText(/report file/i), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: /read report/i }));
  return file;
}

beforeEach(() => {
  jest.clearAllMocks();
  (confirmImportAssessment as jest.Mock).mockResolvedValue({ id: "a-1", score_count: 1 });
});

test("Read report stays disabled until a framework and a file are chosen", () => {
  renderDialog();
  const read = screen.getByRole("button", { name: /read report/i });
  expect(read).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/^assessment$/i), { target: { value: "DISC" } });
  expect(read).toBeDisabled();
});

test("DISC: preview, edit a score, confirm receives the edited row; nothing else writes", async () => {
  (previewImportAssessment as jest.Mock).mockResolvedValue({
    framework: "DISC",
    source: "file_upload",
    score_count: 2,
    typing_count: 0,
    dimensions: ["D", "I"],
    scores: [
      { category: "DISC", dimension: "D", score_numeric: 80 },
      { category: "DISC", dimension: "I", score_numeric: 40 },
    ],
    typing: null,
  });
  renderDialog();
  const file = chooseAndRead("DISC");
  await screen.findByTestId("upload-review");
  expect(previewImportAssessment).toHaveBeenCalledWith("DISC", file);
  expect(confirmImportAssessment).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText("D"), { target: { value: "65" } });
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

  await waitFor(() => expect(confirmImportAssessment).toHaveBeenCalledTimes(1));
  expect((confirmImportAssessment as jest.Mock).mock.calls[0][0]).toEqual({
    framework: "DISC",
    source: "file_upload",
    scores: [
      { category: "DISC", dimension: "D", score_numeric: 65 },
      { category: "DISC", dimension: "I", score_numeric: 40 },
    ],
    typing: null,
  });
  expect(importAssessment).not.toHaveBeenCalled();
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
});

test("CLIFTON: rank order, top five only, unknown theme blocks save until removed, reorder re-ranks", async () => {
  const themes = ["Learner", "achiever", "Banana", "Input", "Strategic", "Woo", "Focus"];
  (previewImportAssessment as jest.Mock).mockResolvedValue({
    framework: "CLIFTON",
    source: "file_upload",
    score_count: themes.length,
    typing_count: 0,
    dimensions: themes,
    // Deliberately out of order: the review sorts by rank.
    scores: themes
      .map((t, i) => ({ category: "Themes", dimension: t, score_text: t, rank: i + 1 }))
      .reverse(),
    typing: null,
  });
  renderDialog();
  chooseAndRead("CLIFTON");
  const review = await screen.findByTestId("upload-review");
  const items = within(review).getAllByRole("listitem");
  expect(items).toHaveLength(5);
  expect(items.map((li) => li.textContent)).toEqual([
    expect.stringContaining("Learner"),
    expect.stringContaining("Achiever"), // canonical spelling
    expect.stringContaining("Banana"),
    expect.stringContaining("Input"),
    expect.stringContaining("Strategic"),
  ]);
  expect(within(items[2]).getByText(/not a cliftonstrengths theme/i)).toBeInTheDocument();
  const save = screen.getByRole("button", { name: /^save$/i });
  expect(save).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: /remove banana/i }));
  expect(save).not.toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: /move achiever up/i }));
  fireEvent.click(save);

  await waitFor(() => expect(confirmImportAssessment).toHaveBeenCalledTimes(1));
  const body = (confirmImportAssessment as jest.Mock).mock.calls[0][0];
  expect(body.framework).toBe("CLIFTON");
  expect(body.scores.map((s: { dimension: string; rank: number }) => [s.dimension, s.rank])).toEqual([
    ["Achiever", 1],
    ["Learner", 2],
    ["Input", 3],
    ["Strategic", 4],
  ]);
  for (const s of body.scores) expect(s).not.toHaveProperty("known");
  expect(importAssessment).not.toHaveBeenCalled();
});

test("a preview failure is shown, not swallowed", async () => {
  (previewImportAssessment as jest.Mock).mockRejectedValue(new Error("500"));
  renderDialog();
  chooseAndRead("CLIFTON", "themes.csv");
  expect(await screen.findByRole("alert")).toHaveTextContent(/could not read that report/i);
  expect(screen.queryByTestId("upload-review")).not.toBeInTheDocument();
  expect(confirmImportAssessment).not.toHaveBeenCalled();
});

test("a confirm failure is shown and the dialog stays open", async () => {
  (previewImportAssessment as jest.Mock).mockResolvedValue({
    framework: "MBTI",
    source: "file_upload",
    score_count: 0,
    typing_count: 1,
    dimensions: ["INTJ"],
    scores: [],
    typing: { type_system: "MBTI", type_code: "INTJ", clarity: null },
  });
  (confirmImportAssessment as jest.Mock).mockRejectedValue(new Error("nope"));
  renderDialog();
  chooseAndRead("MBTI");
  await screen.findByTestId("upload-review");
  fireEvent.change(screen.getByLabelText(/^type$/i), { target: { value: "ENTP" } });
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect((confirmImportAssessment as jest.Mock).mock.calls[0][0].typing).toEqual({
    type_system: "MBTI",
    type_code: "ENTP",
    clarity: null,
  });
  expect(onOpenChange).not.toHaveBeenCalledWith(false);
});

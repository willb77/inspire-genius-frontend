import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AddAssessmentModal } from "@/components/dashboard/v2/AddAssessmentModal";
import * as profileSvc from "@/services/profile/profile";

jest.mock("@/services/profile/profile");
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const MBTI = { name: "Myers-Briggs (MBTI)", framework: "MBTI" };

const PREVIEW = {
  framework: "MBTI",
  source: "file_upload",
  filename: "mbti.pdf",
  score_count: 1,
  typing_count: 1,
  dimensions: ["E-I"],
  scores: [
    {
      category: "axis",
      dimension: "E-I",
      score_type: "Percentage",
      score_numeric: 25,
    },
  ],
  typing: { type_system: "MBTI", type_code: "INTJ", clarity: null },
};

function pickFile() {
  const file = new File(["x"], "mbti.pdf", { type: "application/pdf" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe("AddAssessmentModal (confirm-before-save)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the framework title", () => {
    wrap(<AddAssessmentModal target={MBTI} onOpenChange={jest.fn()} />);
    expect(screen.getByText("Add Myers-Briggs (MBTI)")).toBeInTheDocument();
  });

  it("keeps Review disabled until a file is chosen", () => {
    wrap(<AddAssessmentModal target={MBTI} onOpenChange={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Review/i })).toBeDisabled();
  });

  it("previews on Review WITHOUT saving, then saves only on Confirm", async () => {
    (profileSvc.previewImportAssessment as jest.Mock).mockResolvedValue(PREVIEW);
    (profileSvc.confirmImportAssessment as jest.Mock).mockResolvedValue({
      id: "a1",
      user_id: "u1",
      framework: "MBTI",
      assessed_at: "2026-07-14T00:00:00Z",
      source: "file_upload",
      is_authoritative: true,
      score_count: 1,
      typing_count: 1,
    });
    const onImported = jest.fn();
    wrap(
      <AddAssessmentModal
        target={MBTI}
        onOpenChange={jest.fn()}
        onImported={onImported}
      />,
    );

    pickFile();
    fireEvent.click(screen.getByRole("button", { name: /Review/i }));

    // Preview called; confirm NOT yet — nothing saved on Review.
    await waitFor(() =>
      expect(profileSvc.previewImportAssessment).toHaveBeenCalledWith(
        "MBTI",
        expect.any(File),
      ),
    );
    await waitFor(() => expect(screen.getByText("INTJ")).toBeInTheDocument());
    expect(profileSvc.confirmImportAssessment).not.toHaveBeenCalled();

    // Confirm writes.
    fireEvent.click(screen.getByRole("button", { name: /Confirm & add/i }));
    await waitFor(() =>
      expect(profileSvc.confirmImportAssessment).toHaveBeenCalledWith(
        expect.objectContaining({ framework: "MBTI", scores: PREVIEW.scores }),
      ),
    );
    await waitFor(() => expect(onImported).toHaveBeenCalled());
  });

  it("renders nothing interactable when target is null", () => {
    wrap(<AddAssessmentModal target={null} onOpenChange={jest.fn()} />);
    expect(screen.queryByText(/Review/i)).not.toBeInTheDocument();
  });
});

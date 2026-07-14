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

describe("AddAssessmentModal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the framework title when a target is set", () => {
    wrap(<AddAssessmentModal target={MBTI} onOpenChange={jest.fn()} />);
    expect(
      screen.getByText("Add Myers-Briggs (MBTI)"),
    ).toBeInTheDocument();
  });

  it("keeps upload disabled until a file is chosen", () => {
    wrap(<AddAssessmentModal target={MBTI} onOpenChange={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: /Upload & add/i }),
    ).toBeDisabled();
  });

  it("imports the chosen file and closes on success", async () => {
    (profileSvc.importAssessment as jest.Mock).mockResolvedValue({
      id: "a1",
      user_id: "u1",
      framework: "MBTI",
      assessed_at: "2026-07-14T00:00:00Z",
      source: "file_upload",
      is_authoritative: true,
      score_count: 1,
      typing_count: 1,
    });
    const onOpenChange = jest.fn();
    const onImported = jest.fn();
    wrap(
      <AddAssessmentModal
        target={MBTI}
        onOpenChange={onOpenChange}
        onImported={onImported}
      />,
    );

    const file = new File(["I,N,T,J\n1,2,3,4"], "mbti.csv", {
      type: "text/csv",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const uploadBtn = screen.getByRole("button", { name: /Upload & add/i });
    expect(uploadBtn).not.toBeDisabled();
    fireEvent.click(uploadBtn);

    await waitFor(() =>
      expect(profileSvc.importAssessment).toHaveBeenCalledWith("MBTI", file),
    );
    await waitFor(() => expect(onImported).toHaveBeenCalled());
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("accepts PDF and XLSX in addition to CSV", () => {
    wrap(<AddAssessmentModal target={MBTI} onOpenChange={jest.fn()} />);
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const accept = input.getAttribute("accept") ?? "";
    expect(accept).toContain(".pdf");
    expect(accept).toContain(".xlsx");
    expect(accept).toContain(".csv");
  });

  it("renders nothing interactable when target is null", () => {
    wrap(<AddAssessmentModal target={null} onOpenChange={jest.fn()} />);
    expect(screen.queryByText(/Upload & add/i)).not.toBeInTheDocument();
  });
});

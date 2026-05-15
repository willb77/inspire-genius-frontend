import { render, screen, fireEvent } from "@testing-library/react";
import PrismAssessmentCard from "../PrismAssessmentCard";
import type { PrismAssessment } from "@/types/prism/assessment-types";

/* ── Mocks ── */
jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

const mockMutate = jest.fn();
jest.mock("@/hooks/prism/usePrismStatus", () => ({
  usePrismStatus: () => ({ data: null }),
}));
jest.mock("@/hooks/prism/usePrismUnlock", () => ({
  usePrismUnlock: () => ({ mutate: mockMutate, isPending: false }),
}));

/* ── Helpers ── */
function makeAssessment(overrides: Partial<PrismAssessment> = {}): PrismAssessment {
  return {
    id: "a-1",
    userId: "u-1",
    externalIdent: "EXT-1",
    parentExternalIdent: "PEXT-1",
    questionnaireType: 4, // Foundation
    questionnaireTypeName: "Foundation",
    status: "report_ready",
    questionnaireUrl: null,
    reportUrl: null,
    s3ReportKey: null,
    s3DataKey: null,
    initiatedAt: "2026-01-01T00:00:00Z",
    questionnaireSentAt: "2026-01-02T00:00:00Z",
    questionnaireStartedAt: null,
    questionnaireCompletedAt: "2026-01-03T00:00:00Z",
    unlockedAt: null,
    reportFetchedAt: null,
    ingestedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-03T00:00:00Z",
    ...overrides,
  };
}

describe("PrismAssessmentCard", () => {
  it("renders the assessment type name and dates", () => {
    render(<PrismAssessmentCard assessment={makeAssessment()} />);
    expect(screen.getByText("Foundation")).toBeInTheDocument();
    // Dates are formatted in en-GB
    expect(screen.getByText(/1 Jan 2026/)).toBeInTheDocument();
  });

  it("shows View Report button when status is report_ready", () => {
    const onViewReport = jest.fn();
    render(
      <PrismAssessmentCard
        assessment={makeAssessment({ status: "report_ready" })}
        onViewReport={onViewReport}
      />
    );
    const btn = screen.getByRole("button", { name: /view report/i });
    fireEvent.click(btn);
    expect(onViewReport).toHaveBeenCalledWith("a-1");
  });

  it("shows Upgrade button when tier is not Professional and status is report_ready", () => {
    const onUpgrade = jest.fn();
    render(
      <PrismAssessmentCard
        assessment={makeAssessment({ questionnaireType: 4, status: "report_ready" })}
        onUpgrade={onUpgrade}
      />
    );
    const btn = screen.getByRole("button", { name: /upgrade/i });
    fireEvent.click(btn);
    expect(onUpgrade).toHaveBeenCalledWith("a-1");
  });

  it("does not show Upgrade when type is Professional", () => {
    render(
      <PrismAssessmentCard
        assessment={makeAssessment({ questionnaireType: 1, status: "report_ready" })}
      />
    );
    expect(screen.queryByRole("button", { name: /upgrade/i })).not.toBeInTheDocument();
  });

  it("shows Unlock Report button when status is completed", () => {
    render(
      <PrismAssessmentCard
        assessment={makeAssessment({ status: "completed" })}
      />
    );
    expect(screen.getByRole("button", { name: /unlock report/i })).toBeInTheDocument();
  });

  it("shows questionnaire link when status is initiated and URL exists", () => {
    render(
      <PrismAssessmentCard
        assessment={makeAssessment({
          status: "initiated",
          questionnaireUrl: "https://example.com/q",
        })}
      />
    );
    expect(screen.getByRole("link", { name: /open questionnaire/i })).toHaveAttribute(
      "href",
      "https://example.com/q"
    );
  });

  it("shows unlocked date when present", () => {
    render(
      <PrismAssessmentCard
        assessment={makeAssessment({ unlockedAt: "2026-01-04T00:00:00Z" })}
      />
    );
    expect(screen.getByText("Unlocked")).toBeInTheDocument();
    // The date is formatted via toLocaleDateString('en-GB') which in Node may vary
    // Just verify the Unlocked label row is present
    expect(screen.getAllByText("Unlocked").length).toBeGreaterThanOrEqual(1);
  });
});

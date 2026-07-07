import { render, screen, fireEvent } from "@testing-library/react";

import {
  WelcomeBackTile,
  type WelcomeBackAssessment,
} from "@/components/dashboard/v2/WelcomeBackTile";

function renderTile(overrides?: {
  onResumeConversation?: () => void;
  onRequestAssessment?: () => void;
  onViewReportPdf?: () => void;
  onAddAssessment?: (name: string) => void;
}) {
  const onResumeConversation = overrides?.onResumeConversation ?? jest.fn();
  const onRequestAssessment = overrides?.onRequestAssessment ?? jest.fn();
  const onViewReportPdf = overrides?.onViewReportPdf ?? jest.fn();
  const onAddAssessment = overrides?.onAddAssessment ?? jest.fn();

  const assessments: WelcomeBackAssessment[] = [
    { name: "DiSC", done: true },
    { name: "Hogan", done: false },
  ];

  render(
    <WelcomeBackTile
      displayName="willb77"
      onResumeConversation={onResumeConversation}
      hasReport
      reportFileName="X.csv"
      onRequestAssessment={onRequestAssessment}
      onViewReportPdf={onViewReportPdf}
      profilePercent={40}
      missing={["Resume", "Bio"]}
      assessments={assessments}
      onAddAssessment={onAddAssessment}
    />,
  );

  return {
    onResumeConversation,
    onRequestAssessment,
    onViewReportPdf,
    onAddAssessment,
  };
}

describe("WelcomeBackTile", () => {
  it("renders the welcome heading with the display name", () => {
    renderTile();
    expect(screen.getByText(/Welcome back,/)).toBeInTheDocument();
    expect(screen.getByText("willb77")).toBeInTheDocument();
  });

  it("renders the profile completion label", () => {
    renderTile();
    expect(screen.getByText("Complete profile (40%)")).toBeInTheDocument();
  });

  it("renders the latest report file name", () => {
    renderTile();
    expect(screen.getByText(/Latest report:/)).toBeInTheDocument();
    expect(screen.getByText(/X\.csv/)).toBeInTheDocument();
  });

  it("calls onRequestAssessment when the request button is clicked", () => {
    const { onRequestAssessment } = renderTile();
    fireEvent.click(
      screen.getByRole("button", { name: /Request an Assessment/i }),
    );
    expect(onRequestAssessment).toHaveBeenCalledTimes(1);
  });

  it("calls onViewReportPdf when the view report button is clicked", () => {
    const { onViewReportPdf } = renderTile();
    fireEvent.click(screen.getByRole("button", { name: /View Report PDF/i }));
    expect(onViewReportPdf).toHaveBeenCalledTimes(1);
  });

  it("calls onAddAssessment with the name for a not-done assessment", () => {
    const { onAddAssessment } = renderTile();
    fireEvent.click(
      screen.getByRole("button", { name: /Add Additional Assessment/i }),
    );
    expect(onAddAssessment).toHaveBeenCalledWith("Hogan");
  });
});

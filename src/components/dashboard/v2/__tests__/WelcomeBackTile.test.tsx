import { render, screen, fireEvent } from "@testing-library/react";

import {
  WelcomeBackTile,
  type WelcomeBackAssessment,
  type WelcomeBackPersonalInfo,
} from "@/components/dashboard/v2/WelcomeBackTile";

function renderTile(overrides?: {
  onResumeConversation?: () => void;
  onRequestAssessment?: () => void;
  onViewReportPdf?: () => void;
  onAddAssessment?: (name: string) => void;
  onAddPersonalInfo?: (name: string) => void;
}) {
  const onResumeConversation = overrides?.onResumeConversation ?? jest.fn();
  const onRequestAssessment = overrides?.onRequestAssessment ?? jest.fn();
  const onViewReportPdf = overrides?.onViewReportPdf ?? jest.fn();
  const onAddAssessment = overrides?.onAddAssessment ?? jest.fn();
  const onAddPersonalInfo = overrides?.onAddPersonalInfo ?? jest.fn();

  const assessments: WelcomeBackAssessment[] = [
    { name: "DiSC", done: true },
    { name: "Hogan", done: false },
  ];
  const personalInfo: WelcomeBackPersonalInfo[] = [
    { name: "Resume", done: false },
    { name: "Bio", done: false },
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
      assessments={assessments}
      personalInfo={personalInfo}
      onAddAssessment={onAddAssessment}
      onAddPersonalInfo={onAddPersonalInfo}
    />,
  );

  return {
    onResumeConversation,
    onRequestAssessment,
    onViewReportPdf,
    onAddAssessment,
    onAddPersonalInfo,
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

  it("renders both completeness columns", () => {
    renderTile();
    expect(screen.getByText("Additional assessments")).toBeInTheDocument();
    expect(screen.getByText("Additional Personal Info")).toBeInTheDocument();
  });

  it("calls onRequestAssessment when the request button is clicked", () => {
    const { onRequestAssessment } = renderTile();
    fireEvent.click(
      screen.getByRole("button", { name: /Request PRISM Inventory/i }),
    );
    expect(onRequestAssessment).toHaveBeenCalledTimes(1);
  });

  it("calls onViewReportPdf when the view report button is clicked", () => {
    const { onViewReportPdf } = renderTile();
    fireEvent.click(screen.getByRole("button", { name: /View Inventory PDF/i }));
    expect(onViewReportPdf).toHaveBeenCalledTimes(1);
  });

  it("calls onAddAssessment with the name for a not-done assessment", () => {
    const { onAddAssessment } = renderTile();
    fireEvent.click(screen.getByRole("button", { name: "Add Hogan" }));
    expect(onAddAssessment).toHaveBeenCalledWith("Hogan");
  });

  it("greys out (disables) the Add button for a done assessment", () => {
    const { onAddAssessment } = renderTile();
    const doneAdd = screen.getByRole("button", { name: "DiSC added" });
    expect(doneAdd).toBeDisabled();
    fireEvent.click(doneAdd);
    expect(onAddAssessment).not.toHaveBeenCalled();
  });

  it("calls onAddPersonalInfo with the name for a personal-info item", () => {
    const { onAddPersonalInfo } = renderTile();
    fireEvent.click(screen.getByRole("button", { name: "Add Resume" }));
    expect(onAddPersonalInfo).toHaveBeenCalledWith("Resume");
  });
});

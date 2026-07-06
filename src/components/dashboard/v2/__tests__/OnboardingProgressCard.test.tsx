import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingProgressCard } from "../OnboardingProgressCard";

describe("OnboardingProgressCard", () => {
  const baseProps = {
    profilePercent: 40,
    missing: ["Resume", "Bio"],
    prismStatusLabel: "PRISM · Jun 9, 2026",
    assessments: [
      { name: "DiSC", done: true },
      { name: "Hogan", done: false },
    ],
  };

  it("renders the complete-profile label with the percentage", () => {
    render(<OnboardingProgressCard {...baseProps} />);
    expect(screen.getByText("Complete profile (40%)")).toBeInTheDocument();
  });

  it("renders the assessment names", () => {
    render(<OnboardingProgressCard {...baseProps} />);
    expect(screen.getByText("DiSC")).toBeInTheDocument();
    expect(screen.getByText("Hogan")).toBeInTheDocument();
  });

  it("renders the missing chips and prism status", () => {
    render(<OnboardingProgressCard {...baseProps} />);
    expect(screen.getByText("Resume")).toBeInTheDocument();
    expect(screen.getByText("Bio")).toBeInTheDocument();
    expect(screen.getByText("PRISM · Jun 9, 2026")).toBeInTheDocument();
  });

  it("calls onAddAssessment with the name of a not-done assessment", () => {
    const onAddAssessment = jest.fn();
    render(
      <OnboardingProgressCard
        {...baseProps}
        onAddAssessment={onAddAssessment}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Add Additional Assessment/i }),
    );
    expect(onAddAssessment).toHaveBeenCalledWith("Hogan");
  });
});

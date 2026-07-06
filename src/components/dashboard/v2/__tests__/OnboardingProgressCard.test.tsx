import { render, screen } from "@testing-library/react";
import { OnboardingProgressCard } from "../OnboardingProgressCard";

describe("OnboardingProgressCard", () => {
  it("renders the percentage and default caption", () => {
    render(<OnboardingProgressCard percent={15} />);
    expect(screen.getByText("15%")).toBeInTheDocument();
    expect(
      screen.getByText("You're just getting started"),
    ).toBeInTheDocument();
  });

  it("renders a custom caption when provided", () => {
    render(
      <OnboardingProgressCard percent={40} caption="You're finding your rhythm" />,
    );
    expect(screen.getByText("You're finding your rhythm")).toBeInTheDocument();
  });

  it("clamps percent above 100 to 100%", () => {
    render(<OnboardingProgressCard percent={140} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("clamps negative percent to 0%", () => {
    render(<OnboardingProgressCard percent={-20} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});

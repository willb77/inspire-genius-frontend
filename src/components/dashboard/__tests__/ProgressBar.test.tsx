import { render, screen } from "@testing-library/react";
import ProgressBar from "../ProgressBar";

describe("ProgressBar (dashboard)", () => {
  it("renders percentage text", () => {
    render(<ProgressBar value={75} />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(<ProgressBar value={50} label="Completion" />);
    expect(screen.getByText("Completion")).toBeInTheDocument();
  });

  it("hides percentage when showPct is false", () => {
    render(<ProgressBar value={30} showPct={false} />);
    expect(screen.queryByText("30%")).not.toBeInTheDocument();
  });
});

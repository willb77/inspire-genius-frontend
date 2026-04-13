import { render, screen } from "@testing-library/react";
import PlaceholderBanner from "../PlaceholderBanner";

describe("PlaceholderBanner", () => {
  it("renders the sample data warning message", () => {
    render(<PlaceholderBanner />);
    expect(
      screen.getByText(/sample data/i)
    ).toBeInTheDocument();
  });

  it("mentions placeholder content", () => {
    render(<PlaceholderBanner />);
    expect(
      screen.getByText(/placeholder content/i)
    ).toBeInTheDocument();
  });
});

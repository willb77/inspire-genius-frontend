import { render } from "@testing-library/react";
import SkeletonCard from "../SkeletonCard";

describe("SkeletonCard", () => {
  it("renders without crashing", () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("applies the animate-pulse class", () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toHaveClass("animate-pulse");
  });

  it("applies custom className", () => {
    const { container } = render(<SkeletonCard className="mt-4" />);
    expect(container.firstChild).toHaveClass("mt-4");
  });
});

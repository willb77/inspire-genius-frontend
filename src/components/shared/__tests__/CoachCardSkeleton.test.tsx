import { render } from "@testing-library/react";
import CoachCardSkeleton from "../CoachCardSkeleton";

describe("CoachCardSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<CoachCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders skeleton elements (pulse placeholders)", () => {
    const { container } = render(<CoachCardSkeleton />);
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders dual action layout by default", () => {
    const { container } = render(<CoachCardSkeleton />);
    // Dual layout has two skeleton buttons in a flex row
    const flexRow = container.querySelector(".flex.items-center.gap-3");
    expect(flexRow).toBeInTheDocument();
  });

  it("renders single action layout when actions='single'", () => {
    const { container } = render(<CoachCardSkeleton actions="single" />);
    // Single layout should not have the dual flex row
    const flexRow = container.querySelector(".flex.items-center.gap-3");
    expect(flexRow).not.toBeInTheDocument();
  });
});

/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProgressBar from "../ProgressBar";

describe("ProgressBar Component", () => {
  
  // Ensures the component displays the correct "current/total"
  //    text and renders the progress fill element.
  test("renders current/total text", () => {
    const { container } = render(<ProgressBar current={2} total={5} />);

    expect(screen.getByText("2/5")).toBeInTheDocument();

    // The filled bar exists inside the relative container
    const filled = container.querySelector(".relative > .absolute");
    expect(filled).toBeInTheDocument();
  });

  // Verifies correct percentage width calculation
  //    Example: 3/4 = 75%
  test("calculates correct percentage width", () => {
    const { container } = render(<ProgressBar current={3} total={4} />);

    const fill = container.querySelector(".relative > .absolute") as HTMLElement | null;

    expect(fill).not.toBeNull();
    expect(fill).toHaveStyle("width: 75%");
  });

  // Ensures negative current values are clamped to 0%
  test("clamps percentage: below 0 becomes 0%", () => {
    const { container } = render(<ProgressBar current={-5} total={5} />);

    const fill = container.querySelector(".relative > .absolute") as HTMLElement | null;

    expect(fill).not.toBeNull();
    expect(fill).toHaveStyle("width: 0%");
  });

  // Ensures current values above total clamp to 100%
  test("clamps percentage: above 100 becomes 100%", () => {
    const { container } = render(<ProgressBar current={10} total={5} />);

    const fill = container.querySelector(".relative > .absolute") as HTMLElement | null;

    expect(fill).not.toBeNull();
    expect(fill).toHaveStyle("width: 100%");
  });

  // Custom className should be applied to the wrapper element
  test("applies custom className to wrapper", () => {
    const { container } = render(
      <ProgressBar current={1} total={5} className="extra-class" />
    );

    expect(container.firstChild).toHaveClass("extra-class");
  });

  // Ensures required structural elements (wrapper, bg bar) exist
  test("renders progress bar structure", () => {
    const { container } = render(<ProgressBar current={1} total={5} />);

    // Outer layout wrapper exists
    const wrapper = container.querySelector(".w-full.flex.items-center.gap-2");
    expect(wrapper).toBeInTheDocument();

    // Background bar exists
    const bg = container.querySelector(".bg-gray-200");
    expect(bg).toBeInTheDocument();
  });
});

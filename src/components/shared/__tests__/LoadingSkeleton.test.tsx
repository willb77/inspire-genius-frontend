import { render } from "@testing-library/react";
import LoadingSkeleton from "../LoadingSkeleton";

describe("LoadingSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<LoadingSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders the default 10 rows", () => {
    const { container } = render(<LoadingSkeleton />);
    const rows = container.querySelectorAll(".grid");
    expect(rows).toHaveLength(10);
  });

  it("renders custom row/column count", () => {
    const { container } = render(<LoadingSkeleton rows={3} columns={2} />);
    const rows = container.querySelectorAll(".grid");
    expect(rows).toHaveLength(3);
    // Each row should have 2 skeleton children
    const firstRow = rows[0];
    expect(firstRow.querySelectorAll("[data-slot='skeleton']")).toHaveLength(2);
  });
});

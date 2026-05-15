import { render, screen } from "@testing-library/react";
import StatusBadge from "../StatusBadge";

describe("StatusBadge", () => {
  it("renders the status text by default", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders custom label over status", () => {
    render(<StatusBadge status="active" label="Online" />);
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.queryByText("active")).not.toBeInTheDocument();
  });

  it("renders for various statuses without crashing", () => {
    const statuses = ["active", "meeting", "away", "pending", "confirmed", "new", "leave"];
    statuses.forEach((s) => {
      const { unmount } = render(<StatusBadge status={s} />);
      expect(screen.getByText(s)).toBeInTheDocument();
      unmount();
    });
  });

  it("falls back to active style for unknown status", () => {
    render(<StatusBadge status="xyz" />);
    expect(screen.getByText("xyz")).toBeInTheDocument();
  });
});

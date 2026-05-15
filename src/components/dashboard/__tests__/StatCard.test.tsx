import { render, screen } from "@testing-library/react";
import StatCard from "../StatCard";

const MockIcon = ({ className }: { className?: string }) => (
  <svg data-testid="icon" className={className} />
);

describe("StatCard", () => {
  const props = {
    label: "Total Users",
    value: 1234,
    icon: MockIcon,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-100",
  };

  it("renders label and value", () => {
    render(<StatCard {...props} />);
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("1234")).toBeInTheDocument();
  });

  it("renders the icon", () => {
    render(<StatCard {...props} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders change badge when provided", () => {
    render(<StatCard {...props} change="+12%" />);
    expect(screen.getByText("+12%")).toBeInTheDocument();
  });

  it("does not render change when not provided", () => {
    render(<StatCard {...props} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import PRISMPills from "../PRISMPills";

describe("PRISMPills", () => {
  it("renders default dimensions when no props given", () => {
    render(<PRISMPills />);
    expect(screen.getByText(/Gold 72%/)).toBeInTheDocument();
    expect(screen.getByText(/Green 85%/)).toBeInTheDocument();
    expect(screen.getByText(/Yellow 58%/)).toBeInTheDocument();
    expect(screen.getByText(/Blue 64%/)).toBeInTheDocument();
  });

  it("renders custom dimensions", () => {
    render(
      <PRISMPills
        dimensions={[
          { label: "Alpha", value: 90, bg: "#fff", color: "#000" },
        ]}
      />
    );
    expect(screen.getByText("Alpha 90%")).toBeInTheDocument();
    expect(screen.queryByText(/Gold/)).not.toBeInTheDocument();
  });
});

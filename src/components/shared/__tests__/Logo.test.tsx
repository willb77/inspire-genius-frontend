import { render, screen } from "@testing-library/react";
import { Logo } from "../Logo";

describe("Logo", () => {
  it("renders the logo image with alt text", () => {
    render(<Logo />);
    const img = screen.getByAltText("inspires-genius-logo");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/inspire-genius-logo.jpg");
  });

  it("applies custom className", () => {
    render(<Logo className="h-24" />);
    const img = screen.getByAltText("inspires-genius-logo");
    expect(img.className).toContain("h-24");
  });
});

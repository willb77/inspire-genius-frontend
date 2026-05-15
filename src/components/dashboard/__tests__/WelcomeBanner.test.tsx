import { render, screen } from "@testing-library/react";
import WelcomeBanner from "../WelcomeBanner";

describe("WelcomeBanner", () => {
  it("renders title and subtitle", () => {
    render(<WelcomeBanner title="Hello!" subtitle="Welcome back" />);
    expect(screen.getByText("Hello!")).toBeInTheDocument();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("renders children when provided", () => {
    render(
      <WelcomeBanner title="Hi" subtitle="Sub">
        <button>Get Started</button>
      </WelcomeBanner>
    );
    expect(screen.getByRole("button", { name: "Get Started" })).toBeInTheDocument();
  });

  it("renders without children", () => {
    const { container } = render(
      <WelcomeBanner title="Hi" subtitle="Sub" />
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});

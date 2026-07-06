import { render, screen } from "@testing-library/react";
import { WelcomeHero } from "@/components/dashboard/v2/WelcomeHero";

describe("WelcomeHero", () => {
  it("renders the greeting with the first name", () => {
    render(<WelcomeHero firstName="Will" tier="Individual · Free tier" />);

    expect(
      screen.getByRole("heading", { name: "Welcome, Will" }),
    ).toBeInTheDocument();
  });

  it("renders the tier pill when a tier is provided", () => {
    render(<WelcomeHero firstName="Will" tier="Individual · Free tier" />);

    expect(screen.getByText("Individual · Free tier")).toBeInTheDocument();
  });

  it("introduces Meridian as the user's mentor", () => {
    render(<WelcomeHero firstName="Will" />);

    expect(screen.getByText(/Meridian is your single mentor/i)).toBeInTheDocument();
  });

  it("omits the tier pill when no tier is provided", () => {
    render(<WelcomeHero firstName="Ada" />);

    expect(screen.queryByText("Individual · Free tier")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Welcome, Ada" }),
    ).toBeInTheDocument();
  });
});

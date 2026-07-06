/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { WelcomeTile } from "../WelcomeTile";

describe("WelcomeTile", () => {
  it("renders the personalized welcome heading", () => {
    render(<WelcomeTile firstName="Will" />);
    expect(screen.getByText("Welcome, Will")).toBeInTheDocument();
  });

  it("renders the eyebrow and Meridian sub-copy", () => {
    render(<WelcomeTile firstName="Will" />);
    expect(screen.getByText("Welcome to Inspire Genius")).toBeInTheDocument();
    expect(
      screen.getByText(/Meridian is your single mentor here/),
    ).toBeInTheDocument();
  });
});

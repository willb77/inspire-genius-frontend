/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import PreviewHome from "../PreviewHome";

describe("PreviewHome", () => {
  it("renders without crashing", () => {
    render(<PreviewHome />);
    expect(screen.getByText("Welcome back, James")).toBeInTheDocument();
  });

  it("renders quick link buttons", () => {
    render(<PreviewHome />);
    expect(screen.getByText("Chat with Coaches")).toBeInTheDocument();
    expect(screen.getByText("Manage Coaches")).toBeInTheDocument();
    expect(screen.getByText("My Documents")).toBeInTheDocument();
    expect(screen.getByText("Help & Support")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders stat cards", () => {
    render(<PreviewHome />);
    expect(screen.getByText("AI Coaches")).toBeInTheDocument();
    expect(screen.getByText("Conversations")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("PRISM Profile")).toBeInTheDocument();
  });

  it("renders About PRISM section", () => {
    render(<PreviewHome />);
    expect(screen.getByText("About PRISM")).toBeInTheDocument();
    expect(screen.getByText("PRISM Overview Video")).toBeInTheDocument();
  });

  it("renders Ask Meridian section", () => {
    render(<PreviewHome />);
    expect(screen.getByText("Ask Meridian")).toBeInTheDocument();
    expect(screen.getByText("Take a Tour")).toBeInTheDocument();
  });

  it("renders Explore Coaches section with coach names", () => {
    render(<PreviewHome />);
    expect(screen.getByText("Explore Coaches")).toBeInTheDocument();
    expect(screen.getByText("Meridian")).toBeInTheDocument();
    expect(screen.getByText("Aura")).toBeInTheDocument();
    expect(screen.getByText("Sage")).toBeInTheDocument();
    expect(screen.getByText("Phoenix")).toBeInTheDocument();
  });
});

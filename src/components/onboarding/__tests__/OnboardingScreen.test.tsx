/** @jest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import OnboardingScreen from "../OnboardingScreen";

// ---------------------------------------------
// Mock: useNavigate to track navigation calls
// ---------------------------------------------
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// ---------------------------------------------
// Mock: Logo component (simple test-friendly div)
// ---------------------------------------------
jest.mock("../../shared/Logo", () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}));

// ---------------------------------------------
// Mock: OnboardingImage wrapper to verify props
// ---------------------------------------------
jest.mock("../OnboardingImage", () => {
  return function MockOnboardingImage({ src, alt, children }: any) {
    return (
      <div data-testid="onboarding-image">
        <img src={src} alt={alt} />
        {children}
      </div>
    );
  };
});

// ---------------------------------------------
// Mock: Button to simplify behavior in tests
// ---------------------------------------------
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe("OnboardingScreen", () => {
  // Default props reused across tests
  const defaultProps = {
    imageSrc: "/test.png",
    imageAlt: "Test image",
    title: "Welcome!",
    subtitle: "This is onboarding",
    nextPath: "/next",
    ctaLabel: "Continue",
    overlays: <div data-testid="overlay">Overlay</div>,
  };

  // Test: Component renders essential UI elements
  test("renders logo, title, subtitle, and image", () => {
    render(<OnboardingScreen {...defaultProps} />);

    expect(screen.getByTestId("logo")).toBeInTheDocument();
    expect(screen.getByText("Welcome!")).toBeInTheDocument();
    expect(screen.getByText("This is onboarding")).toBeInTheDocument();

    const img = screen.getByAltText("Test image");
    expect(img).toHaveAttribute("src", "/test.png");
  });

  // Test: Overlays should appear inside the image wrapper
  test("renders overlays inside OnboardingImage", () => {
    render(<OnboardingScreen {...defaultProps} />);
    expect(screen.getByTestId("overlay")).toBeInTheDocument();
  });

  // Test: CTA label should render correctly
  test("renders CTA label", () => {
    render(<OnboardingScreen {...defaultProps} />);
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  // Test: Clicking CTA button triggers navigation
  test("clicking CTA button triggers navigation", () => {
    render(<OnboardingScreen {...defaultProps} />);

    const btn = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith("/next");
  });

  // Test: Subtitle should not render when not provided
  test("does not render subtitle when not provided", () => {
    render(<OnboardingScreen {...defaultProps} subtitle={undefined} />);
    expect(screen.queryByText("This is onboarding")).not.toBeInTheDocument();
  });

  // Test: Default CTA label is used when ctaLabel missing
  test("renders default CTA label when none provided", () => {
    render(<OnboardingScreen {...defaultProps} ctaLabel={undefined} />);
    expect(screen.getByText("Let's go")).toBeInTheDocument();
  });
});

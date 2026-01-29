/**
 * @jest-environment jsdom
 *
 * This test validates:
 * - OnboardingOne renders correct props into OnboardingScreen
 * - The callout overlay appears with correct content
 * - The `start()` function from useTour runs automatically after 100ms
 */

import { render, screen, act } from "@testing-library/react";
import OnboardingOne from "../OnboardingOne";
import { ROUTES } from "@/constants/routes";

/* --------------------------------------------------------------------------
   MOCK: useTour()
   We mock the `start` function so we can verify if it is being called after
   the component triggers its internal timeout.
--------------------------------------------------------------------------- */
const mockStart = jest.fn();

jest.mock("@/context/useTour", () => ({
  useTour: () => ({
    start: mockStart,
  }),
}));

/* --------------------------------------------------------------------------
   MOCK: OnboardingScreen
   Instead of the real UI, the mock prints props for simple assertion.
--------------------------------------------------------------------------- */
jest.mock("@/components/onboarding/OnboardingScreen", () => (props: any) => (
  <div data-testid="onboarding-screen">
    <div data-testid="image-src">{props.imageSrc}</div>
    <div data-testid="image-alt">{props.imageAlt}</div>
    <div data-testid="title">{props.title}</div>
    <div data-testid="subtitle">{props.subtitle}</div>
    <div data-testid="cta-label">{props.ctaLabel}</div>
    <div data-testid="next-path">{props.nextPath}</div>
    <div data-testid="overlays">{props.overlays}</div>
  </div>
));

/* --------------------------------------------------------------------------
   MOCK: OnboardingCallout component
   Simple mock to check callout title only.
--------------------------------------------------------------------------- */
jest.mock("@/components/onboarding/OnboardingCallout", () => ({
  OnboardingCallout: (props: any) => (
    <div data-testid="onboarding-callout">
      <span data-testid="callout-title">{props.title}</span>
    </div>
  ),
}));

/* --------------------------------------------------------------------------
   TEST SUITE: OnboardingOne
--------------------------------------------------------------------------- */
describe("OnboardingOne", () => {
  // Use fake timers so we can simulate the 100ms timeout
  beforeEach(() => {
    jest.useFakeTimers();
    mockStart.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  /** ----------------------------------------------------------------------
   * TEST 1 — Component renders with correct content and props
   * ----------------------------------------------------------------------
   * Confirms:
   * - Wrapper element exists
   * - All props (image, title, CTA, nextPath) are correct
   * - Callout overlay renders with correct title
   ---------------------------------------------------------------------- */
  test("renders correctly with expected props", () => {
    const { container } = render(<OnboardingOne />);

    // Check component wrapper
    const wrapper = container.querySelector('[data-tour="onboarding-one"]');
    expect(wrapper).toBeInTheDocument();

    // Check screen container
    expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();

    // Validate all props passed into OnboardingScreen mock
    expect(screen.getByTestId("image-src")).toHaveTextContent(
      "/images/onboarding/onboarding-one.png"
    );
    expect(screen.getByTestId("image-alt")).toHaveTextContent(
      "Onboarding step one"
    );
    expect(screen.getByTestId("title")).toHaveTextContent("Let's get started!");
    expect(screen.getByTestId("subtitle")).toHaveTextContent(
      "Upload your personal info to begin working with your AI Coach."
    );
    expect(screen.getByTestId("cta-label")).toHaveTextContent("Let's go");

    // Next route should be onboarding two
    expect(screen.getByTestId("next-path")).toHaveTextContent(
      ROUTES.ONBOARDING.TWO
    );

    // Check overlay callout
    const callout = screen.getByTestId("onboarding-callout");
    expect(callout).toBeInTheDocument();
    expect(screen.getByTestId("callout-title")).toHaveTextContent(
      "Actionable insights"
    );
  });

  /** ----------------------------------------------------------------------
   * TEST 2 — useTour.start() is called after 100ms
   * ----------------------------------------------------------------------
   * The component uses useEffect + setTimeout to trigger the tour.
   * We simulate time passing to ensure the callback is executed.
   ---------------------------------------------------------------------- */
  test("calls start() from useTour after timeout", () => {
    render(<OnboardingOne />);

    // Immediately after render, start() should NOT be called yet
    expect(mockStart).not.toHaveBeenCalled();

    // Fast-forward timers to 100ms
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Now start() must be called exactly once
    expect(mockStart).toHaveBeenCalledTimes(1);
  });
});

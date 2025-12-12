/**
 * @jest-environment jsdom
 *
 * Test Suite: SocialLogin Component
 *
 * This suite verifies that the SocialLogin UI correctly reflects the
 * authentication status returned by the `useSocialLogin` hook.
 *
 * Covered:
 *  • Status-based messages (processing, done, error)
 *  • Loader animation behavior depending on status
 */

import { render, screen } from "@testing-library/react";
import SocialLogin from "../SocialLogin";

/* -------------------------------------------------------------------------
   MOCK: useSocialLogin Hook
   Allows returning different `status` values to test UI behavior
-------------------------------------------------------------------------- */
const mockUseSocialLogin = jest.fn();

jest.mock("@/hooks/auth/useSocialLogin", () => ({
  useSocialLogin: () => mockUseSocialLogin(),
}));

/* -------------------------------------------------------------------------
   MOCK: Loader icon from lucide-react
   We replace the icon with a simple <svg> so we can verify class names
-------------------------------------------------------------------------- */
jest.mock("lucide-react", () => ({
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="loader" className={className} />
  ),
}));

/* -------------------------------------------------------------------------
   TEST SUITE
-------------------------------------------------------------------------- */

describe("SocialLogin Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* -----------------------------------------------------------------------
     CASE 1: Status = "processing"
     Expect:
       • Status message: "Completing social login..."
       • Loader should be spinning
  ------------------------------------------------------------------------ */
  test("shows processing message and spinning loader", () => {
    mockUseSocialLogin.mockReturnValue({ status: "processing" });

    render(<SocialLogin />);

    // Verify message
    expect(
      screen.getByText("Completing social login...")
    ).toBeInTheDocument();

    // Verify loader animation
    const loader = screen.getByTestId("loader");
    expect(loader).toHaveClass("animate-spin");
  });

  /* -----------------------------------------------------------------------
     CASE 2: Status = "done"
     Expect:
       • Success message about login verification
       • Loader should NOT spin anymore
  ------------------------------------------------------------------------ */
  test("shows success message when status is done", () => {
    mockUseSocialLogin.mockReturnValue({ status: "done" });

    render(<SocialLogin />);

    expect(
      screen.getByText(
        "Login verified. You can close this tab if it doesn't redirect automatically."
      )
    ).toBeInTheDocument();

    const loader = screen.getByTestId("loader");
    expect(loader).not.toHaveClass("animate-spin");
  });

  /* -----------------------------------------------------------------------
     CASE 3: Status = "error"
     Expect:
       • Error message: redirecting to login
       • Loader should NOT spin
  ------------------------------------------------------------------------ */
  test("shows error message when status is error", () => {
    mockUseSocialLogin.mockReturnValue({ status: "error" });

    render(<SocialLogin />);

    expect(
      screen.getByText("Redirecting to login...")
    ).toBeInTheDocument();

    const loader = screen.getByTestId("loader");
    expect(loader).not.toHaveClass("animate-spin");
  });
});

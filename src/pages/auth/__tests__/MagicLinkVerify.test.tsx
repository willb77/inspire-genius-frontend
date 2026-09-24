/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/* ── Mocks ── */
const mockMutate = jest.fn();
const mockCompleteAuth = jest.fn();
const mockNavigate = jest.fn();
const mockGetToken = jest.fn();
// Read inside the factory below, so each test can flip the mutation into its
// error state without re-isolating the module (which fights the hooks).
let mockIsError = false;

jest.mock("@/hooks/magic-auth/useMagicAuth", () => ({
  useVerifyMagicLink: () => ({
    mutate: mockMutate,
    isError: mockIsError,
    isPending: !mockIsError,
  }),
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    completeAuthFromPayload: mockCompleteAuth,
  }),
}));

jest.mock("@/lib/storage", () => ({
  getToken: () => mockGetToken(),
}));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

jest.mock("@/components/auth/AuthLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-layout">{children}</div>
  ),
}));

jest.mock("@/components/auth/AuthHeader", () => ({
  __esModule: true,
  default: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="auth-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

import MagicLinkVerify from "../MagicLinkVerify";

function renderPage(token: string = "test-magic-token") {
  return render(
    <MemoryRouter initialEntries={[`/magic-verify?token=${token}`]}>
      <MagicLinkVerify />
    </MemoryRouter>
  );
}

describe("MagicLinkVerify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsError = false;
    mockGetToken.mockResolvedValue(null);
  });

  test("renders verifying state with spinner", () => {
    renderPage();
    expect(screen.getByText("Verifying...")).toBeInTheDocument();
    expect(screen.getByText("Please wait while we sign you in")).toBeInTheDocument();
  });

  test("calls mutate with the token from URL params", () => {
    renderPage("abc-123");
    expect(mockMutate).toHaveBeenCalledWith(
      { token: "abc-123" },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  test("does not call mutate when token is empty", () => {
    render(
      <MemoryRouter initialEntries={["/magic-verify"]}>
        <MagicLinkVerify />
      </MemoryRouter>
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  test("only calls mutate once (ref guard)", () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={["/magic-verify?token=tok"]}>
        <MagicLinkVerify />
      </MemoryRouter>
    );
    // Re-render should not trigger a second call
    rerender(
      <MemoryRouter initialEntries={["/magic-verify?token=tok"]}>
        <MagicLinkVerify />
      </MemoryRouter>
    );
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});

/**
 * A sign-in link is single-use, so the same link can verify twice — a second
 * tab, a double click, or a mail scanner fetching the URL. The first call signs
 * the person in; the second comes back 400. The failure screen must not be
 * shown to somebody whose session is actually live (staging-b, 2026-09-23: a
 * user hit the replay, then spent three minutes re-clicking the dead link,
 * trying Sign up and trying Google, all of which dead-end).
 */
describe("MagicLinkVerify — failed verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsError = true;
  });

  test("shows the expiry screen when no session exists", async () => {
    mockGetToken.mockResolvedValue(null);
    renderPage();

    expect(
      await screen.findByText("This sign-in link has expired")
    ).toBeInTheDocument();
    expect(screen.getByText("Send me a new sign-in link")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("forwards an already-signed-in visitor instead of stranding them", async () => {
    mockGetToken.mockResolvedValue("an-access-token");
    renderPage();

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true })
    );
    expect(screen.queryByText("This sign-in link has expired")).toBeNull();
  });

  test("falls back to the expiry screen when storage throws", async () => {
    mockGetToken.mockRejectedValue(new Error("storage unavailable"));
    renderPage();

    expect(
      await screen.findByText("This sign-in link has expired")
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/* ── Mocks ── */
const mockMutate = jest.fn();
const mockCompleteAuth = jest.fn();

jest.mock("@/hooks/magic-auth/useMagicAuth", () => ({
  useVerifyMagicLink: () => ({
    mutate: mockMutate,
    isError: false,
    isPending: true,
  }),
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    completeAuthFromPayload: mockCompleteAuth,
  }),
}));

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

// TODO: Error state test would require module re-isolation which conflicts
// with React hooks. The error UI is covered by visual/integration testing.

/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/* ── Mocks ── */
const mockMutateAsync = jest.fn();
jest.mock("@/hooks/magic-auth/useMagicAuth", () => ({
  useRequestMagicLink: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
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

jest.mock("lucide-react", () => ({
  Mail: () => <span data-testid="mail-icon" />,
}));

import MagicLinkLogin from "../MagicLinkLogin";

function renderPage() {
  return render(
    <MemoryRouter>
      <MagicLinkLogin />
    </MemoryRouter>
  );
}

describe("MagicLinkLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
  });

  test("renders the form initially", () => {
    renderPage();
    expect(screen.getByText("Magic Link")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send magic link/i })).toBeInTheDocument();
  });

  test("renders back to login link", () => {
    renderPage();
    expect(screen.getByText("Back to login")).toBeInTheDocument();
  });

  test("submits form and shows confirmation", async () => {
    renderPage();

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });

    const submitBtn = screen.getByRole("button", { name: /send magic link/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ email: "user@example.com" });
    });

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
      expect(screen.getByText(/we sent a magic link to user@example.com/i)).toBeInTheDocument();
    });
  });

  test("shows try different email button after send", async () => {
    renderPage();

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send magic link/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
    });

    // Click "Try a different email" to go back to form
    fireEvent.click(screen.getByText("Try a different email"));

    await waitFor(() => {
      expect(screen.getByText("Magic Link")).toBeInTheDocument();
    });
  });

  test("does not submit with empty email", () => {
    renderPage();
    const submitBtn = screen.getByRole("button", { name: /send magic link/i });
    fireEvent.click(submitBtn);
    // The form has required attribute, so submission is prevented by the browser
    // mutateAsync should not be called
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});

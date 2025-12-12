/**
 * @jest-environment jsdom
 *
 * Test suite for useAuthVerifyOtpMutation:
 *  - Verifies OTP flow for signup email verification
 *  - Verifies OTP flow for MFA login
 *  - Ensures correct API is called depending on nextStep
 *  - Ensures mutation returns correct structured data
 *  - Handles custom success and error callbacks
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useAuthVerifyOtpMutation } from "../useVerifyOtp";

import {
  getEmail,
  getPassword,
  getSession,
  getNextStep,
} from "@/lib/storage";

import {
  verifySignupApi,
  loginApi,
} from "@/services/auth.service";

import { NEXT_STEPS } from "@/constants/routes";
import type { AxiosError } from "axios";

/* ---------------------------
   Mock required dependencies
----------------------------*/

// Mock local storage helpers
jest.mock("@/lib/storage", () => ({
  getEmail: jest.fn(),
  getPassword: jest.fn(),
  getSession: jest.fn(),
  getNextStep: jest.fn(),
}));

// Mock backend API functions
jest.mock("@/services/auth.service", () => ({
  verifySignupApi: jest.fn(),
  loginApi: jest.fn(),
}));

/**
 * Utility wrapper so the hook has a valid React Query provider.
 */
const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
};

describe("useAuthVerifyOtpMutation", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // reset mocks before each test
  });

  const mockVars = { otp: "123456" }; // common OTP used for all tests

  /* ------------------------------------------------------------
     TEST 1: When next step = VERIFY_EMAIL → call verifySignupApi
     ------------------------------------------------------------ */
  test("calls verifySignupApi when step = VERIFY_EMAIL", async () => {
    // Simulate stored values in session/local storage
    (getEmail as jest.Mock).mockResolvedValue("test@example.com");
    (getPassword as jest.Mock).mockResolvedValue("pass123");
    (getSession as jest.Mock).mockResolvedValue(null);
    (getNextStep as jest.Mock).mockResolvedValue(NEXT_STEPS.VERIFY_EMAIL);

    // Mock API success response
    const verifyResponse = {
      status: true,
      message: "Email verified",
    };
    (verifySignupApi as jest.Mock).mockResolvedValue(verifyResponse);

    // Render the hook
    const { result } = renderHook(() => useAuthVerifyOtpMutation(), {
      wrapper: createWrapper(),
    });

    // Trigger the mutation
    act(() => {
      result.current.mutate(mockVars);
    });

    // Wait for mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Ensure verifySignupApi was called correctly
    expect(verifySignupApi).toHaveBeenCalledWith(
      "test@example.com",
      "123456"
    );

    // Ensure hook returns correct data structure
    expect(result.current.data).toEqual({
      mode: "verify_email",
      data: verifyResponse,
      email: "test@example.com",
      password: "pass123",
    });
  });

  /* ------------------------------------------------------------
     TEST 2: When step != VERIFY_EMAIL → call loginApi (MFA flow)
     ------------------------------------------------------------ */
  test("calls loginApi when step != VERIFY_EMAIL", async () => {
    // Storage values for MFA flow
    (getEmail as jest.Mock).mockResolvedValue("test@example.com");
    (getPassword as jest.Mock).mockResolvedValue("mypassword");
    (getSession as jest.Mock).mockResolvedValue("sess-123");
    (getNextStep as jest.Mock).mockResolvedValue("VERIFY_MFA");

    // Mock API login success
    const loginResponse = {
      status: true,
      data: { access_token: "abc123" },
    };
    (loginApi as jest.Mock).mockResolvedValue(loginResponse);

    const { result } = renderHook(() => useAuthVerifyOtpMutation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockVars);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Ensure loginApi is called with correct payload
    expect(loginApi).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "mypassword",
      verification: true,
      session: "sess-123",
      otp: "123456",
    });

    // Expect correct structured data returned
    expect(result.current.data).toEqual({
      mode: "verify_mfa",
      data: loginResponse,
      email: "test@example.com",
    });
  });

  /* ------------------------------------------------------------
     TEST 3: onSuccess callback should be executed
     ------------------------------------------------------------ */
  test("calls custom onSuccess callback", async () => {
    // Storage setup
    (getEmail as jest.Mock).mockResolvedValue("me@example.com");
    (getPassword as jest.Mock).mockResolvedValue("1234");
    (getSession as jest.Mock).mockResolvedValue(null);
    (getNextStep as jest.Mock).mockResolvedValue(NEXT_STEPS.VERIFY_EMAIL);

    (verifySignupApi as jest.Mock).mockResolvedValue({
      status: true,
      message: "OK",
    });

    const onSuccessMock = jest.fn();

    const { result } = renderHook(
      () => useAuthVerifyOtpMutation({ onSuccess: onSuccessMock }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.mutate(mockVars);
    });

    await waitFor(() => expect(onSuccessMock).toHaveBeenCalled());
  });

  /* ------------------------------------------------------------
     TEST 4: onError callback should be executed on API failure
     ------------------------------------------------------------ */
  test("calls custom onError callback when API fails", async () => {
    // Setup storage for email verification path
    (getEmail as jest.Mock).mockResolvedValue("x@example.com");
    (getPassword as jest.Mock).mockResolvedValue("pass");
    (getSession as jest.Mock).mockResolvedValue(null);
    (getNextStep as jest.Mock).mockResolvedValue(NEXT_STEPS.VERIFY_EMAIL);

    const mockError = { message: "Bad OTP" } as AxiosError;

    // Mock failure from backend
    (verifySignupApi as jest.Mock).mockRejectedValueOnce(mockError);

    const onErrorMock = jest.fn();

    const { result } = renderHook(
      () => useAuthVerifyOtpMutation({ onError: onErrorMock }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.mutate(mockVars);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onErrorMock).toHaveBeenCalledWith(
      mockError,
      mockVars,
      undefined
    );
  });
});

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

jest.mock("@/lib/storage", () => ({
  getEmail: jest.fn(),
  getPassword: jest.fn(),
  getSession: jest.fn(),
  getNextStep: jest.fn(),
}));

jest.mock("@/services/auth.service", () => ({
  verifySignupApi: jest.fn(),
  loginApi: jest.fn(),
}));

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
    jest.clearAllMocks();
  });

  const mockVars = { otp: "123456" };

  test("calls verifySignupApi when step = VERIFY_EMAIL", async () => {
    (getEmail as jest.Mock).mockResolvedValue("test@example.com");
    (getPassword as jest.Mock).mockResolvedValue("pass123");
    (getSession as jest.Mock).mockResolvedValue(null);
    (getNextStep as jest.Mock).mockResolvedValue(NEXT_STEPS.VERIFY_EMAIL);

    const verifyResponse = {
      status: true,
      message: "Email verified",
    };

    (verifySignupApi as jest.Mock).mockResolvedValue(verifyResponse);

    const { result } = renderHook(() => useAuthVerifyOtpMutation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockVars);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(verifySignupApi).toHaveBeenCalledWith("test@example.com", "123456");

    expect(result.current.data).toEqual({
      mode: "verify_email",
      data: verifyResponse,
      email: "test@example.com",
      password: "pass123",
    });
  });

  test("calls loginApi when step != VERIFY_EMAIL", async () => {
    (getEmail as jest.Mock).mockResolvedValue("test@example.com");
    (getPassword as jest.Mock).mockResolvedValue("mypassword");
    (getSession as jest.Mock).mockResolvedValue("sess-123");
    (getNextStep as jest.Mock).mockResolvedValue("VERIFY_MFA");

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

    expect(loginApi).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "mypassword",
      verification: true,
      session: "sess-123",
      otp: "123456",
    });

    expect(result.current.data).toEqual({
      mode: "verify_mfa",
      data: loginResponse,
      email: "test@example.com",
    });
  });

  test("calls custom onSuccess callback", async () => {
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

  test("calls custom onError callback when API fails", async () => {
    (getEmail as jest.Mock).mockResolvedValue("x@example.com");
    (getPassword as jest.Mock).mockResolvedValue("pass");
    (getSession as jest.Mock).mockResolvedValue(null);
    (getNextStep as jest.Mock).mockResolvedValue(NEXT_STEPS.VERIFY_EMAIL);

    const mockError = { message: "Bad OTP" } as AxiosError;

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

    expect(onErrorMock).toHaveBeenCalledWith(mockError, mockVars, undefined);
  });
});

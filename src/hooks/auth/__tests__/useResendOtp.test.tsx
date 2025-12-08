import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useResendOtpMutation } from "../useResendOtp";

import { getEmail } from "@/lib/storage";
import { resendVerificationApi } from "@/services/auth.service";
import type { AxiosError } from "axios";

jest.mock("@/lib/storage", () => ({
  getEmail: jest.fn(),
}));

jest.mock("@/services/auth.service", () => ({
  resendVerificationApi: jest.fn(),
}));

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });

  return ({ children }: any) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useResendOtpMutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("successfully resends OTP", async () => {
    (getEmail as jest.Mock).mockResolvedValueOnce("test@example.com");

    const mockResponse = { status: true, message: "OTP Sent" };
    (resendVerificationApi as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useResendOtpMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getEmail).toHaveBeenCalled();
    expect(resendVerificationApi).toHaveBeenCalledWith("test@example.com");
    expect(result.current.data).toEqual(mockResponse);
  });

  test("handles error correctly", async () => {
    (getEmail as jest.Mock).mockResolvedValueOnce("test@example.com");

    const mockError = {
      message: "Server error",
      isAxiosError: true,
    } as AxiosError;

    (resendVerificationApi as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useResendOtpMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Server error");
  });

  test("calls custom onSuccess callback", async () => {
    (getEmail as jest.Mock).mockResolvedValueOnce("me@example.com");

    const mockResponse = { status: true, message: "OTP sent" };
    (resendVerificationApi as jest.Mock).mockResolvedValueOnce(mockResponse);

    const onSuccessMock = jest.fn();

    const { result } = renderHook(
      () => useResendOtpMutation({ onSuccess: onSuccessMock }),
      { wrapper: createWrapper() }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccessMock).toHaveBeenCalledWith(
      mockResponse,
      undefined,
      undefined
    );
  });

  test("calls custom onError callback", async () => {
    (getEmail as jest.Mock).mockResolvedValueOnce("me@example.com");

    const mockError = {
      message: "Network error",
      isAxiosError: true,
    } as AxiosError;

    (resendVerificationApi as jest.Mock).mockRejectedValueOnce(mockError);

    const onErrorMock = jest.fn();

    const { result } = renderHook(
      () => useResendOtpMutation({ onError: onErrorMock }),
      { wrapper: createWrapper() }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onErrorMock).toHaveBeenCalledWith(mockError, undefined, undefined);
  });
});

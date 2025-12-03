/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthSignupMutation } from "./useSignup";
import { signupApi } from "@/services/auth.service";
import type { ApiEnvelope, LoginDataPayload } from "@/types/auth/api-types";
import type { AxiosError } from "axios";

// ---- MOCKS ----
jest.mock("@/services/auth.service", () => ({
  signupApi: jest.fn(),
}));

// Wrapper for React Query
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

describe("useAuthSignupMutation", () => {
  beforeEach(() => jest.clearAllMocks());

  const vars = {
    email: "test@example.com",
    password: "pass123",
    confirmPassword: "pass123",
  };

const mockApiResponse: ApiEnvelope<LoginDataPayload> = {
  status: true,
  message: "Success",
  data: {
    access_token: "abc123",
    refresh_token: "xyz987",
    email: "test@example.com",
    user_id: "1",
  },
};

  test("calls signupApi with correct payload and returns expected data", async () => {
    (signupApi as jest.Mock).mockResolvedValueOnce(mockApiResponse);

    const { result } = renderHook(() => useAuthSignupMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(vars);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(signupApi).toHaveBeenCalledWith({
      email: vars.email,
      password: vars.password,
      confirm_password: vars.confirmPassword,
    });

    expect(result.current.data).toEqual({
      data: mockApiResponse,
      email: vars.email,
      password: vars.password,
    });
  });

  test("handles API error properly", async () => {
    const mockError = {
      message: "Signup failed",
      isAxiosError: true,
    } as AxiosError;

    (signupApi as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAuthSignupMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(vars);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(mockError);
  });

  test("calls custom onSuccess callback", async () => {
    (signupApi as jest.Mock).mockResolvedValueOnce(mockApiResponse);

    const onSuccessMock = jest.fn();

    const { result } = renderHook(
      () => useAuthSignupMutation({ onSuccess: onSuccessMock }),
      { wrapper: createWrapper() }
    );

    result.current.mutate(vars);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccessMock).toHaveBeenCalledWith(
      {
        data: mockApiResponse,
        email: vars.email,
        password: vars.password,
      },
      vars,
      undefined
    );
  });

  test("calls custom onError callback", async () => {
    const mockError = {
      message: "Server error",
      isAxiosError: true,
    } as AxiosError;

    (signupApi as jest.Mock).mockRejectedValueOnce(mockError);

    const onErrorMock = jest.fn();

    const { result } = renderHook(
      () => useAuthSignupMutation({ onError: onErrorMock }),
      { wrapper: createWrapper() }
    );

    result.current.mutate(vars);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onErrorMock).toHaveBeenCalledWith(mockError, vars, undefined);
  });
});

/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthLoginMutation } from "./useLogin";
import { loginApi } from "@/services/auth.service";
import type { AxiosError } from "axios";

jest.mock("@/services/auth.service", () => ({
  loginApi: jest.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAuthLoginMutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("successfully logs in and returns data with credentials", async () => {
    const mockResponse = {
      status: true,
      data: {
        token: "mock-jwt-token",
        user: { id: 1, email: "test@example.com", name: "Test User" },
      },
    };

    (loginApi as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAuthLoginMutation(), {
      wrapper: createWrapper(),
    });

    const credentials = {
      email: "test@example.com",
      password: "password123",
    };

    result.current.mutate(credentials);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(loginApi).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
      verification: false,
    });

    expect(result.current.data).toEqual({
      data: mockResponse,
      email: "test@example.com",
      password: "password123",
    });
  });

  test("handles login error", async () => {
    const mockError = {
      response: {
        status: 401,
        data: { message: "Invalid credentials" },
      },
      isAxiosError: true,
    } as AxiosError;

    (loginApi as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAuthLoginMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      email: "wrong@example.com",
      password: "wrongpassword",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(loginApi).toHaveBeenCalledWith({
      email: "wrong@example.com",
      password: "wrongpassword",
      verification: false,
    });

    expect(result.current.error).toEqual(mockError);
  });

  test("accepts custom mutation options", async () => {
    const mockResponse = {
      status: true,
      data: { token: "token-123" },
    };

    (loginApi as jest.Mock).mockResolvedValueOnce(mockResponse);

    const onSuccessMock = jest.fn();
    const onErrorMock = jest.fn();

    const { result } = renderHook(
      () =>
        useAuthLoginMutation({
          onSuccess: onSuccessMock,
          onError: onErrorMock,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    result.current.mutate({
      email: "user@test.com",
      password: "pass123",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccessMock).toHaveBeenCalledWith(
      {
        data: mockResponse,
        email: "user@test.com",
        password: "pass123",
      },
      { email: "user@test.com", password: "pass123" },
      undefined
    );

    expect(onErrorMock).not.toHaveBeenCalled();
  });

  test("calls onError callback when mutation fails", async () => {
    const mockError = {
      response: { status: 500, data: { message: "Server error" } },
      isAxiosError: true,
    } as AxiosError;

    (loginApi as jest.Mock).mockRejectedValueOnce(mockError);

    const onErrorMock = jest.fn();
    const onSuccessMock = jest.fn();

    const { result } = renderHook(
      () =>
        useAuthLoginMutation({
          onError: onErrorMock,
          onSuccess: onSuccessMock,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    result.current.mutate({
      email: "fail@test.com",
      password: "failpass",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onErrorMock).toHaveBeenCalledWith(
      mockError,
      { email: "fail@test.com", password: "failpass" },
      undefined
    );

    expect(onSuccessMock).not.toHaveBeenCalled();
  });

  test("passes correct verification flag to loginApi", async () => {
    const mockResponse = {
      status: true,
      data: { token: "verify-token" },
    };

    (loginApi as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAuthLoginMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      email: "verify@test.com",
      password: "verifypass",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(loginApi).toHaveBeenCalledWith({
      email: "verify@test.com",
      password: "verifypass",
      verification: false,
    });
  });

  test("returns correct mutation states during execution", async () => {
    const mockResponse = {
      status: true,
      data: { token: "state-token" },
    };

    (loginApi as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockResponse), 100);
        })
    );

    const { result } = renderHook(() => useAuthLoginMutation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isIdle).toBe(true);

    result.current.mutate({
      email: "state@test.com",
      password: "statepass",
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPending).toBe(false);
  });

  test("can be reset after mutation", async () => {
    const mockResponse = {
      status: true,
      data: { token: "reset-token" },
    };

    (loginApi as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAuthLoginMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      email: "reset@test.com",
      password: "resetpass",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();

    result.current.reset();

    await waitFor(() => expect(result.current.isIdle).toBe(true));
    
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});
/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { useChangePassword } from "@/hooks/user/useChangePassword";
import { changePassword } from "@/services/user/change-password.service";

// --------------------
// Mocks
// --------------------
jest.mock("@/services/user/change-password.service", () => ({
  changePassword: jest.fn(),
}));

// --------------------
// Query Wrapper
// --------------------
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe("useChangePassword", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------
  // SUCCESS CASE
  // --------------------
  it("calls changePassword with correct payload and returns success response", async () => {
    const mockPayload = {
      current_password: process.env.FAKE_TEST_CHANGE_PASSWORD_CURRENT as string,
      new_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW as string,
      confirm_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW as string,
    };

    const mockResponse = {
      data: null,
      message: "Password changed successfully",
    };

    (changePassword as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useChangePassword(),
      { wrapper: createWrapper() }
    );

    result.current.mutate(mockPayload);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(changePassword).toHaveBeenCalledWith(mockPayload);
    expect(changePassword).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockResponse);
  });

  // --------------------
  // ERROR CASE
  // --------------------
  it("handles API error correctly", async () => {
    const mockPayload = {
      current_password: process.env.FAKE_TEST_CHANGE_PASSWORD_WRONG_CURRENT as string,
      new_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW as string,
      confirm_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW as string,
    };

    const error = {
      response: {
        data: { message: "Current password is incorrect" },
        status: 400,
      },
    } as AxiosError;

    (changePassword as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(
      () => useChangePassword(),
      { wrapper: createWrapper() }
    );

    result.current.mutate(mockPayload);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });

  // --------------------
  // MUTATION WITH CALLBACKS
  // --------------------
  it("calls onSuccess callback when mutation succeeds", async () => {
    const mockPayload = {
      current_password: process.env.FAKE_TEST_CHANGE_PASSWORD_CURRENT as string,
      new_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW as string,
      confirm_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW as string,
    };

    const mockResponse = {
      data: null,
      message: "Password changed successfully",
    };

    const onSuccess = jest.fn();

    (changePassword as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useChangePassword(),
      { wrapper: createWrapper() }
    );

    result.current.mutate(mockPayload, { onSuccess });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(mockResponse, mockPayload, undefined);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  // --------------------
  // MUTATION WITH ERROR CALLBACK
  // --------------------
  it("calls onError callback when mutation fails", async () => {
    const mockPayload = {
      current_password: process.env.FAKE_TEST_CHANGE_PASSWORD_WRONG_CURRENT as string,
      new_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW as string,
      confirm_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW as string,
    };

    const error = {
      response: {
        data: { message: "Current password is incorrect" },
        status: 400,
      },
    } as AxiosError;

    const onError = jest.fn();

    (changePassword as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(
      () => useChangePassword(),
      { wrapper: createWrapper() }
    );

    result.current.mutate(mockPayload, { onError });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalledWith(error, mockPayload, undefined);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  // --------------------
  // MUTATION ASYNC
  // --------------------
  it("works with mutateAsync", async () => {
    const mockPayload = {
      current_password: process.env.FAKE_TEST_CHANGE_PASSWORD_CURRENT as string,
      new_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW as string,
      confirm_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW as string,
    };

    const mockResponse = {
      data: null,
      message: "Password changed successfully",
    };

    (changePassword as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useChangePassword(),
      { wrapper: createWrapper() }
    );

    const response = await result.current.mutateAsync(mockPayload);

    expect(changePassword).toHaveBeenCalledWith(mockPayload);
    expect(response).toEqual(mockResponse);
  });

  // --------------------
  // LOADING STATE
  // --------------------
  it("sets loading state correctly during mutation", async () => {
    const mockPayload = {
      current_password: process.env.FAKE_TEST_CHANGE_PASSWORD_CURRENT as string,
      new_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW as string,
      confirm_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW as string,
    };

    const mockResponse = {
      data: null,
      message: "Password changed successfully",
    };

    (changePassword as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
    );

    const { result } = renderHook(
      () => useChangePassword(),
      { wrapper: createWrapper() }
    );

    expect(result.current.isPending).toBe(false);

    result.current.mutate(mockPayload);

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isPending).toBe(false);
  });
});
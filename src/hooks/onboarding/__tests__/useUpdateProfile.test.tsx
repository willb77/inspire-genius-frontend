/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateProfile } from "../useUpdateProfile";
import { updateProfile } from "@/services/onboarding/profile.service";
import type { AxiosError } from "axios";

/**
 * Mock the updateProfile API so we can simulate
 * success and failure responses inside tests.
 */
jest.mock("@/services/onboarding/profile.service", () => ({
  updateProfile: jest.fn(),
}));

/**
 * Utility wrapper that provides a React Query client.
 * Required because our mutation hook uses React Query.
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useUpdateProfile", () => {
  // Reset all mocks before each test so tests don't interfere
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: verify API is called with correct payload
  test("calls updateProfile with correct payload", async () => {
    (updateProfile as jest.Mock).mockResolvedValue({
      status: true,
      message: "Updated",
    });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: "John" } as any);
    });

    expect(updateProfile).toHaveBeenCalledWith({ name: "John" });
  });

  // Test 2: hook should invalidate the 'me' query on success
  test("invalidates 'me' query on success", async () => {
    const invalidateSpy = jest.fn();

    (updateProfile as jest.Mock).mockResolvedValue({
      status: true,
      message: "Updated",
    });

    // Create a wrapper that lets us spy on invalidateQueries
    const wrapper = ({ children }: any) => {
      const qc = new QueryClient();
      jest.spyOn(qc, "invalidateQueries").mockImplementation(invalidateSpy);

      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    };

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: "John" } as any);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["me"] });
  });

  // Test 3: Ensure custom onSuccess callback executes
  test("calls custom onSuccess when provided", async () => {
    const mockOnSuccess = jest.fn();

    (updateProfile as jest.Mock).mockResolvedValue({
      status: true,
      message: "Updated",
    });

    const { result } = renderHook(
      () =>
        useUpdateProfile({
          onSuccess: mockOnSuccess,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.mutateAsync({ name: "John" } as any);
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  // Test 4: Runs internal 'onSuccess' logic if user does not override it
  test("runs onSuccess branch without custom onSuccess", async () => {
    const invalidateSpy = jest.fn();

    (updateProfile as jest.Mock).mockResolvedValue({
      status: true,
      message: "Updated",
    });

    const wrapper = ({ children }: any) => {
      const qc = new QueryClient();
      jest.spyOn(qc, "invalidateQueries").mockImplementation(invalidateSpy);

      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    };

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: "John" } as any);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["me"] });
  });

  // Test 5: Verify custom onError callback is called
  test("calls custom onError when provided", async () => {
    const mockOnError = jest.fn();
    const err = new Error("Something failed") as AxiosError;

    (updateProfile as jest.Mock).mockRejectedValue(err);

    const { result } = renderHook(
      () =>
        useUpdateProfile({
          onError: mockOnError,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: "John" } as any)
      ).rejects.toThrow("Something failed");
    });

    expect(mockOnError).toHaveBeenCalledWith(err, { name: "John" }, undefined);
  });

  // Test 6: If user explicitly passes onError: undefined
  //            → hook should still run internal error logic
  test("runs internal onError when options.onError is explicitly undefined", async () => {
    const err = new Error("API error") as AxiosError;

    (updateProfile as jest.Mock).mockRejectedValue(err);

    const { result } = renderHook(
      () =>
        useUpdateProfile({
          onError: undefined as any,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: "John" } as any)
      ).rejects.toThrow("API error");
    });
  });

  // Test 7: Default error handler should still throw when no custom handler exists
  test("default onError still throws", async () => {
    const err = new Error("Something went wrong") as AxiosError;

    (updateProfile as jest.Mock).mockRejectedValue(err);

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: "John" } as any)
      ).rejects.toThrow("Something went wrong");
    });
  });
});

/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateProfileMutation } from "../useCreateProfile";
import { createProfile } from "@/services/onboarding/profile.service";
import { toast } from "sonner";
import type { AxiosError } from "axios";

/**
 * Mock the toast notification system so we can assert calls
 * without actually displaying UI notifications.
 */
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

/**
 * Mock the profile service so we can control responses
 * and test success/error paths.
 */
jest.mock("@/services/onboarding/profile.service", () => ({
  createProfile: jest.fn(),
}));

/**
 * Helper function to wrap hooks inside a React Query Provider.
 * Needed because mutations require a QueryClient instance.
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

describe("useCreateProfileMutation", () => {

  // Reset all mocks before each test so tests don't affect each other.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Successful API response triggers toast.success
  test("calls toast.success when API succeeds", async () => {
    (createProfile as jest.Mock).mockResolvedValue({
      status: true,
      success: true,
      message: "Profile saved",
    });

    const { result } = renderHook(() => useCreateProfileMutation(), {
      wrapper: createWrapper(),
    });

    // Execute mutation
    await act(async () => {
      await result.current.mutateAsync({ name: "John" } as any);
    });

    // Must call service with correct payload
    expect(createProfile).toHaveBeenCalledWith({ name: "John" });

    // Should show success toast from message
    expect(toast.success).toHaveBeenCalledWith("Profile saved");
  });

  // Test 2: If API resolves but "status" is false → toast.error + throw error
  test("calls toast.error when service returns failure", async () => {
    (createProfile as jest.Mock).mockResolvedValue({
      status: false,
      message: "Invalid data",
    });

    const { result } = renderHook(() => useCreateProfileMutation(), {
      wrapper: createWrapper(),
    });

    // Mutation should throw error message
    await expect(
      result.current.mutateAsync({ name: "John" } as any)
    ).rejects.toThrow("Invalid data");

    expect(toast.error).toHaveBeenCalledWith("Invalid data");
  });

  // Test 3: Axios error response shows toast.error and rethrows error
  test("calls toast.error on Axios error", async () => {
    const axiosErr = {
      isAxiosError: true,
      response: { data: { message: "Server error" } },
    } as AxiosError;

    (createProfile as jest.Mock).mockRejectedValue(axiosErr);

    const { result } = renderHook(() => useCreateProfileMutation(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({ name: "John" } as any)
    ).rejects.toEqual(axiosErr);

    expect(toast.error).toHaveBeenCalledWith("Server error");
  });

  // Test 4: Custom onSuccess callback is executed if passed
  test("calls custom onSuccess when provided", async () => {
    const customSuccess = jest.fn();

    (createProfile as jest.Mock).mockResolvedValue({
      status: true,
      success: true,
      message: "Profile saved",
    });

    const { result } = renderHook(
      () =>
        useCreateProfileMutation({
          onSuccess: customSuccess,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.mutateAsync({ name: "John" } as any);
    });

    expect(customSuccess).toHaveBeenCalled();
  });

  // Test 5: Mutation should throw error object properly when failure occurs
  test("returns correct error object when thrown", async () => {

    (createProfile as jest.Mock).mockResolvedValue({
      status: false,
      message: "Something failed",
    });

    const { result } = renderHook(() => useCreateProfileMutation(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({ name: "John" } as any)
    ).rejects.toThrow("Something failed");

    expect(toast.error).toHaveBeenCalledWith("Something failed");
  });
});

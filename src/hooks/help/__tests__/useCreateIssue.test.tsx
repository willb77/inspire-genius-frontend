/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "sonner";

import { useCreateIssue } from "@/hooks/help/useCreateIssue";
import { createIssue } from "@/services/help/issues.service";

// --------------------
// Mocks
// --------------------
jest.mock("@/services/help/issues.service", () => ({
  createIssue: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// --------------------
// Test Wrapper
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

describe("useCreateIssue", () => {
  const formData = new FormData();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------
  // Success case
  // --------------------
  it("calls createIssue and shows success toast", async () => {
    (createIssue as jest.Mock).mockResolvedValueOnce({
      message: "Issue created successfully",
    });

    const { result } = renderHook(() => useCreateIssue(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(formData);
    });

    expect(createIssue).toHaveBeenCalledWith(formData);
    expect(toast.success).toHaveBeenCalledWith(
      "Issue created successfully"
    );
  });

  it("shows default success message when API message is missing", async () => {
    (createIssue as jest.Mock).mockResolvedValueOnce({});

    const { result } = renderHook(() => useCreateIssue(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(formData);
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Issue submitted successfully"
    );
  });

  // --------------------
  // Error case
  // --------------------
  it("shows error toast when API fails", async () => {
    const error = {
      response: {
        data: { message: "Something went wrong" },
      },
    } as AxiosError;

    (createIssue as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useCreateIssue(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync(formData);
      } catch {
        // swallow error
      }
    });

    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });

  // --------------------
  // Custom callbacks
  // --------------------
  it("calls custom onSuccess callback if provided", async () => {
    const onSuccess = jest.fn();

    (createIssue as jest.Mock).mockResolvedValueOnce({
      message: "Success",
    });

    const { result } = renderHook(
      () => useCreateIssue({ onSuccess }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.mutateAsync(formData);
    });

    expect(onSuccess).toHaveBeenCalledWith(
      { message: "Success" },
      formData,
      undefined
    );
  });

  it("calls custom onError callback if provided", async () => {
    const onError = jest.fn();
    const error = new Error("Network error");

    (createIssue as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(
      () => useCreateIssue({ onError }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      try {
        await result.current.mutateAsync(formData);
      } catch {
        // swallow error
      }
    });

    expect(onError).toHaveBeenCalledWith(
      error,
      formData,
      undefined
    );
  });
});

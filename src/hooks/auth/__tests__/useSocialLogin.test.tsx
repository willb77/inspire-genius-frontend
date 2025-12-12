/**
 * @jest-environment jsdom
 *
 * Tests for `useSocialLogin`, which handles:
 *  - Reading social login tokens from URL
 *  - Fetching user details using access token
 *  - Completing authentication via `useAuth`
 *  - Handling errors and navigation
 */

import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useSocialLogin } from "../useSocialLogin";
import { toast } from "sonner";
import { useAuth } from "@/context/useAuth";
import { useMeWithTokenQuery } from "@/hooks/auth/useMeWithTokenQuery";

// Mock toast.error to verify error UI behavior
jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ search: "" }), // default location
}));

// Mock Auth context
jest.mock("@/context/useAuth", () => ({
  useAuth: jest.fn(),
}));

// Mock API hook that fetches user from token
jest.mock("@/hooks/auth/useMeWithTokenQuery", () => ({
  useMeWithTokenQuery: jest.fn(),
}));

// Mock sessionStorage for provider cleanup
const mockRemoveItem = jest.fn();
Object.defineProperty(window, "sessionStorage", {
  value: { removeItem: mockRemoveItem },
});

describe("useSocialLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock of Auth context
    (useAuth as jest.Mock).mockReturnValue({
      completeAuthFromPayload: jest.fn(),
    });
  });

  /**
   * Helper for mocking query-string tokens in location.search
   */
  function mockLocation(search: string) {
    (jest.requireMock("react-router-dom") as any).useLocation = () => ({
      search,
    });
  }

  // TEST 1: Missing or invalid token triggers immediate error
  test("error when token is missing", () => {
    mockLocation("?error=missing_token");
    (useMeWithTokenQuery as jest.Mock).mockReturnValue({});

    const { result } = renderHook(() => useSocialLogin());

    expect(result.current.status).toBe("error");
    expect(toast.error).toHaveBeenCalled(); // User sees feedback
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true }); // Redirect to login
  });

  // TEST 2: During loading → status = processing
  test("processing when token exists & loading", () => {
    mockLocation("?access_token=abc");
    (useMeWithTokenQuery as jest.Mock).mockReturnValue({
      isLoading: true,
      isError: false,
      isSuccess: false,
    });

    const { result } = renderHook(() => useSocialLogin());
    expect(result.current.status).toBe("processing");
  });

  // TEST 3: API error → status error + toast error message
  test("error when meQuery fails", () => {
    mockLocation("?access_token=abc");

    (useMeWithTokenQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: { message: "Bad token" },
    });

    const { result } = renderHook(() => useSocialLogin());

    expect(result.current.status).toBe("error");
    expect(toast.error).toHaveBeenCalledWith("Bad token");
  });

  // TEST 4: Successful token → status = done
  test("status=done when token exists and query succeeds", () => {
    mockLocation("?access_token=abc&refresh_token=ref");

    (useMeWithTokenQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: { data: {} },
    });

    const { result } = renderHook(() => useSocialLogin());

    expect(result.current.status).toBe("done");
  });

  // TEST 5: Auth is completed successfully
  test("completeAuthFromPayload is called correctly", async () => {
    mockLocation("?access_token=abc&refresh_token=ref");

    const mockMe = {
      user_id: "u1",
      email: "test@example.com",
      full_name: "Test User",
    };

    // Simulate successful "me" query
    (useMeWithTokenQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: { data: mockMe },
    });

    // Mock completeAuthFromPayload to resolve
    const mockComplete = jest.fn().mockResolvedValue(undefined);
    (useAuth as jest.Mock).mockReturnValue({
      completeAuthFromPayload: mockComplete,
    });

    // Run hook
    await act(async () => {
      renderHook(() => useSocialLogin());
    });

    // Ensure payload is forwarded correctly to Auth context
    expect(mockComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        access_token: "abc",
        refresh_token: "ref",
        user_id: "u1",
        email: "test@example.com",
        full_name: "Test User",
      }),
      "test@example.com",
      { message: "Login successful", clearNextStep: true }
    );

    // Cleanup stored provider (Google/Facebook, etc.)
    expect(mockRemoveItem).toHaveBeenCalledWith("auth:provider");
  });

  // TEST 6: If completeAuthFromPayload fails → toast + redirect
  test("handles failure inside completeAuthFromPayload", async () => {
    mockLocation("?access_token=abc");

    (useMeWithTokenQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: { data: {} },
    });

    // Simulate failure in completing auth flow
    (useAuth as jest.Mock).mockReturnValue({
      completeAuthFromPayload: jest.fn().mockRejectedValue(new Error("Oops")),
    });

    await act(async () => {
      renderHook(() => useSocialLogin());
    });

    expect(toast.error).toHaveBeenCalledWith("Oops"); // show error
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true }); // redirect back
  });
});

/**
 * @jest-environment jsdom
 */

import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useSocialLogin } from "./useSocialLogin";
import { toast } from "sonner";
import { useAuth } from "@/context/useAuth";
import { useMeWithTokenQuery } from "@/hooks/auth/useMeWithTokenQuery";

jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ search: "" }),
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/auth/useMeWithTokenQuery", () => ({
  useMeWithTokenQuery: jest.fn(),
}));

const mockRemoveItem = jest.fn();
Object.defineProperty(window, "sessionStorage", {
  value: {
    removeItem: mockRemoveItem,
  },
});

describe("useSocialLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useAuth as jest.Mock).mockReturnValue({
      completeAuthFromPayload: jest.fn(),
    });
  });

  function mockLocation(search: string) {
    (jest.requireMock("react-router-dom") as any).useLocation = () => ({
      search,
    });
  }

  test("error when token is missing", () => {
    mockLocation("?error=missing_token");
    (useMeWithTokenQuery as jest.Mock).mockReturnValue({});

    const { result } = renderHook(() => useSocialLogin());

    expect(result.current.status).toBe("error");
    expect(toast.error).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

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

  test("completeAuthFromPayload is called correctly", async () => {
    mockLocation("?access_token=abc&refresh_token=ref");

    const mockMe = {
      user_id: "u1",
      email: "test@example.com",
      full_name: "Test User",
    };

    (useMeWithTokenQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: { data: mockMe },
    });

    const mockComplete = jest.fn().mockResolvedValue(undefined);
    (useAuth as jest.Mock).mockReturnValue({
      completeAuthFromPayload: mockComplete,
    });

    await act(async () => {
      renderHook(() => useSocialLogin());
    });

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

    expect(mockRemoveItem).toHaveBeenCalledWith("auth:provider");
  });

  test("handles failure inside completeAuthFromPayload", async () => {
    mockLocation("?access_token=abc");

    (useMeWithTokenQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: { data: {} },
    });

    (useAuth as jest.Mock).mockReturnValue({
      completeAuthFromPayload: jest
        .fn()
        .mockRejectedValue(new Error("Oops")),
    });

    await act(async () => {
      renderHook(() => useSocialLogin());
    });

    expect(toast.error).toHaveBeenCalledWith("Oops");
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });
});

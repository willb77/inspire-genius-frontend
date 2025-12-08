/**
 * @jest-environment jsdom
 */

import { api } from "@/lib/axios";
import {
  requestPasswordReset,
  resetPassword,
  type RequestPasswordResetPayload,
  type ResetPasswordPayload,
} from "../password.service";

// ---- Mock Axios Instance ----
jest.mock("@/lib/axios", () => ({
  api: {
    post: jest.fn(),
  },
}));

describe("password.service.ts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("requestPasswordReset()", () => {
    const payload: RequestPasswordResetPayload = { email: "test@example.com" };

    test("should call API with correct URL and payload", async () => {
      const mockResponse = { status: true, message: "Email sent" };
      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await requestPasswordReset(payload);

      expect(api.post).toHaveBeenCalledWith(
        "/v1/request-password-reset",
        payload
      );

      expect(result).toEqual(mockResponse);
    });

    test("should return API error response", async () => {
      const mockResponse = { status: false, message: "User not found" };
      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await requestPasswordReset(payload);

      expect(result).toEqual(mockResponse);
    });

    test("should throw error if API rejects", async () => {
      const error = new Error("Network error");
      (api.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(requestPasswordReset(payload)).rejects.toThrow("Network error");
    });
  });

  describe("resetPassword()", () => {
    const payload: ResetPasswordPayload = {
      reset_token: "abc123",
      new_password: "NewPass@123",
      confirm_password: "NewPass@123",
    };

    test("should call API with correct URL and payload", async () => {
      const mockResponse = { status: true, success: true };
      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await resetPassword(payload);

      expect(api.post).toHaveBeenCalledWith("/v1/reset-password", payload);
      expect(result).toEqual(mockResponse);
    });

    test("should return API error response", async () => {
      const mockResponse = { status: false, message: "Invalid token" };
      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await resetPassword(payload);

      expect(result).toEqual(mockResponse);
    });

    test("should throw error when API rejects", async () => {
      const error = new Error("Server error");
      (api.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(resetPassword(payload)).rejects.toThrow("Server error");
    });
  });
});

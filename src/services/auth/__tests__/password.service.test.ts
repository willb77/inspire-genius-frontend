/**
 * @jest-environment jsdom
 *
 * Tests for the password.service API functions:
 *  - requestPasswordReset()
 *  - resetPassword()
 *
 * These tests ensure:
 *  - Correct API endpoints are called
 *  - Payloads are passed properly
 *  - Successful responses are returned correctly
 *  - Failures and thrown errors are handled properly
 */

import { api } from "@/lib/axios";
import {
  requestPasswordReset,
  resetPassword,
  type RequestPasswordResetPayload,
  type ResetPasswordPayload,
} from "../password.service";

// Mock Axios instance so API calls do not hit the real server
jest.mock("@/lib/axios", () => ({
  api: {
    post: jest.fn(), // mock only the .post method
  },
}));

describe("password.service.ts", () => {
  beforeEach(() => {
    // Ensures clean mock state before each test
    jest.clearAllMocks();
  });

  // REQUEST PASSWORD RESET
  describe("requestPasswordReset()", () => {
    const payload: RequestPasswordResetPayload = { email: "test@example.com" };

    test("should call API with correct URL and payload", async () => {
      const mockResponse = { status: true, message: "Email sent" };

      // Simulate successful API response
      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await requestPasswordReset(payload);

      // Verify correct endpoint + payload
      expect(api.post).toHaveBeenCalledWith(
        "/v1/request-password-reset",
        payload
      );

      // API result should be forwarded correctly
      expect(result).toEqual(mockResponse);
    });

    test("should return API error response", async () => {
      // Backend returns { status: false } which should simply pass through
      const mockResponse = { status: false, message: "User not found" };

      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await requestPasswordReset(payload);

      // Ensure function returns error envelope without altering it
      expect(result).toEqual(mockResponse);
    });

    test("should throw error if API rejects", async () => {
      const error = new Error("Network error");

      // Simulate axios rejecting (network issues, server down, etc.)
      (api.post as jest.Mock).mockRejectedValueOnce(error);

      // Function should rethrow the original error
      await expect(requestPasswordReset(payload)).rejects.toThrow("Network error");
    });
  });

  // RESET PASSWORD
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

      // Ensure API endpoint and payload are correct
      expect(api.post).toHaveBeenCalledWith("/v1/reset-password", payload);

      // Ensure returned response is exactly what backend returned
      expect(result).toEqual(mockResponse);
    });

    test("should return API error response", async () => {
      const mockResponse = { status: false, message: "Invalid token" };

      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await resetPassword(payload);

      // Should directly return backend error response
      expect(result).toEqual(mockResponse);
    });

    test("should throw error when API rejects", async () => {
      const error = new Error("Server error");

      (api.post as jest.Mock).mockRejectedValueOnce(error);

      // Service should propagate the thrown error
      await expect(resetPassword(payload)).rejects.toThrow("Server error");
    });
  });
});

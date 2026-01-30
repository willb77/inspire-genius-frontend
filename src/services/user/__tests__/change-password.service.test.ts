/**
 * Test Suite: changePassword API function
 *
 * This suite verifies:
 *  • Correct POST request is made to the backend
 *  • Function returns the expected response on success
 *  • Function sends the correct payload structure
 *  • Function throws an error when the API request fails
 */

import { api } from "@/lib/axios";
import {
  changePassword,
  type ChangePasswordRequest,
  type ChangePasswordResponse,
} from "../change-password.service";

// -----------------------------------------------------------------------------
// MOCK axios instance (`api.post`)
// -----------------------------------------------------------------------------
jest.mock("@/lib/axios", () => ({
  api: {
    post: jest.fn(), // mock only the POST method
  },
}));

describe("changePassword API", () => {
  // Example payload sent to backend
  const mockPayload: ChangePasswordRequest = {
    current_password: "oldPassword123",
    new_password: "newPassword456",
    confirm_password: "newPassword456",
  };

  beforeEach(() => {
    jest.clearAllMocks(); // Ensure clean mocks for every test
  });

  // SUCCESS CASE
  test("should send POST request and return response data", async () => {
    const mockResponse: ChangePasswordResponse = {
      status: true,
      success: true,
      message: "Password changed successfully",
      data: null,
    };

    // Mock axios POST to return a resolved promise with data
    (api.post as jest.Mock).mockResolvedValue({ data: mockResponse });

    // Call the function being tested
    const result = await changePassword(mockPayload);

    // Ensure POST request was made with correct endpoint + data
    expect(api.post).toHaveBeenCalledWith(
      "/v1/change-password",
      mockPayload
    );

    // Returned value should match the mock API response
    expect(result).toEqual(mockResponse);
  });

  // SUCCESS CASE - With additional data
  test("should handle response with additional data", async () => {
    const mockResponse: ChangePasswordResponse<{ userId: number }> = {
      status: true,
      success: true,
      message: "Password updated",
      data: {
        userId: 123,
      },
    };

    // Mock axios POST to return a resolved promise with data
    (api.post as jest.Mock).mockResolvedValue({ data: mockResponse });

    // Call the function being tested
    const result = await changePassword(mockPayload);

    // Ensure POST request was made with correct endpoint + data
    expect(api.post).toHaveBeenCalledWith(
      "/v1/change-password",
      mockPayload
    );

    // Returned value should match the mock API response
    expect(result).toEqual(mockResponse);
  });

  // SUCCESS CASE - Minimal response
  test("should handle response with partial fields", async () => {
    const mockResponse: ChangePasswordResponse = {
      success: true,
      message: "Password changed",
    };

    // Mock axios POST to return a resolved promise with data
    (api.post as jest.Mock).mockResolvedValue({ data: mockResponse });

    // Call the function being tested
    const result = await changePassword(mockPayload);

    // Ensure POST request was made with correct endpoint + data
    expect(api.post).toHaveBeenCalledWith(
      "/v1/change-password",
      mockPayload
    );

    // Returned value should match the mock API response
    expect(result).toEqual(mockResponse);
  });

  // FAILURE CASE - Invalid current password
  test("should throw error when current password is incorrect", async () => {
    const mockError = new Error("Current password is incorrect");

    // Simulate axios throwing error
    (api.post as jest.Mock).mockRejectedValue(mockError);

    // Function should forward the error
    await expect(changePassword(mockPayload)).rejects.toThrow(
      "Current password is incorrect"
    );

    // Ensure axios was called exactly once
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  // FAILURE CASE - Password validation error
  test("should throw error when passwords do not match", async () => {
    const invalidPayload: ChangePasswordRequest = {
      current_password: "oldPassword123",
      new_password: "newPassword456",
      confirm_password: "differentPassword789",
    };

    const mockError = new Error("Passwords do not match");

    // Simulate axios throwing error
    (api.post as jest.Mock).mockRejectedValue(mockError);

    // Function should forward the error
    await expect(changePassword(invalidPayload)).rejects.toThrow(
      "Passwords do not match"
    );

    // Ensure POST request was made with the invalid payload
    expect(api.post).toHaveBeenCalledWith(
      "/v1/change-password",
      invalidPayload
    );
  });

  // FAILURE CASE - Network error
  test("should throw error when network request fails", async () => {
    const mockError = new Error("Network Error");

    // Simulate network error
    (api.post as jest.Mock).mockRejectedValue(mockError);

    // Function should forward the error
    await expect(changePassword(mockPayload)).rejects.toThrow("Network Error");

    // Ensure POST request was attempted
    expect(api.post).toHaveBeenCalledWith(
      "/v1/change-password",
      mockPayload
    );
  });

  // FAILURE CASE - Unauthorized
  test("should throw error when user is unauthorized", async () => {
    const mockError = new Error("Unauthorized");

    // Simulate axios throwing unauthorized error
    (api.post as jest.Mock).mockRejectedValue(mockError);

    // Function should forward the error
    await expect(changePassword(mockPayload)).rejects.toThrow("Unauthorized");

    // Ensure axios was called exactly once
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
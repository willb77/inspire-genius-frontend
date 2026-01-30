/**
 * Test Suite: getMe API function
 *
 * This suite verifies:
 *  • Correct GET request is made to the backend
 *  • Function returns the expected response on success
 *  • Function handles generic types correctly
 *  • Function throws an error when the API request fails
 */

import { api } from "@/lib/axios";
import { getMe, type MeResponse } from "../me.service";

// -----------------------------------------------------------------------------
// MOCK axios instance (`api.get`)
// -----------------------------------------------------------------------------
jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn(), // mock only the GET method
  },
}));

describe("getMe API", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Ensure clean mocks for every test
  });

  // SUCCESS CASE - Default type
  test("should send GET request and return response data", async () => {
    const mockResponse: MeResponse = {
      status: true,
      success: true,
      message: "User fetched successfully",
      data: {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
      },
    };

    // Mock axios GET to return a resolved promise with data
    (api.get as jest.Mock).mockResolvedValue({ data: mockResponse });

    // Call the function being tested
    const result = await getMe();

    // Ensure GET request was made with correct endpoint
    expect(api.get).toHaveBeenCalledWith("/v1/me");

    // Returned value should match the mock API response
    expect(result).toEqual(mockResponse);
  });

  // SUCCESS CASE - With generic type
  test("should handle generic type correctly", async () => {
    interface CustomUser {
      userId: number;
      username: string;
      role: string;
    }

    const mockResponse: MeResponse<CustomUser> = {
      status: true,
      success: true,
      message: "Success",
      data: {
        userId: 123,
        username: "testuser",
        role: "admin",
      },
    };

    // Mock axios GET to return a resolved promise with data
    (api.get as jest.Mock).mockResolvedValue({ data: mockResponse });

    // Call the function with generic type
    const result = await getMe<CustomUser>();

    // Ensure GET request was made with correct endpoint
    expect(api.get).toHaveBeenCalledWith("/v1/me");

    // Returned value should match the mock API response
    expect(result).toEqual(mockResponse);
  });

  // SUCCESS CASE - Partial response
  test("should handle response with partial fields", async () => {
    const mockResponse: MeResponse = {
      success: true,
      data: {
        id: 1,
        name: "Jane Doe",
      },
    };

    // Mock axios GET to return a resolved promise with data
    (api.get as jest.Mock).mockResolvedValue({ data: mockResponse });

    // Call the function being tested
    const result = await getMe();

    // Ensure GET request was made with correct endpoint
    expect(api.get).toHaveBeenCalledWith("/v1/me");

    // Returned value should match the mock API response
    expect(result).toEqual(mockResponse);
  });

  // FAILURE CASE
  test("should throw error when API fails", async () => {
    const mockError = new Error("Unauthorized");

    // Simulate axios throwing error
    (api.get as jest.Mock).mockRejectedValue(mockError);

    // Function should forward the error
    await expect(getMe()).rejects.toThrow("Unauthorized");

    // Ensure axios was called exactly once
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  // FAILURE CASE - Network error
  test("should throw error when network request fails", async () => {
    const mockError = new Error("Network Error");

    // Simulate network error
    (api.get as jest.Mock).mockRejectedValue(mockError);

    // Function should forward the error
    await expect(getMe()).rejects.toThrow("Network Error");

    // Ensure GET request was attempted
    expect(api.get).toHaveBeenCalledWith("/v1/me");
  });
});
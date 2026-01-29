/**
 * Test Suite: acceptInvitation API function
 *
 * This suite verifies:
 *  • Correct POST request is made to the backend
 *  • Function returns the expected response on success
 *  • Function throws an error when the API request fails
 */

import { api } from "@/lib/axios";
import {
  acceptInvitation,
  type AcceptInvitationPayload,
} from "../invitation.service";

// -----------------------------------------------------------------------------
// MOCK axios instance (`api.post`)
// -----------------------------------------------------------------------------
jest.mock("@/lib/axios", () => ({
  api: {
    post: jest.fn(), // mock only the POST method
  },
}));

describe("acceptInvitation API", () => {
  // Example payload sent to backend
  const mockPayload: AcceptInvitationPayload = {
    invitation_token: "test-token",
    new_password: process.env.TEST_VALID_PASSWORD as string,
  };

  beforeEach(() => {
    jest.clearAllMocks(); // Ensure clean mocks for every test
  });

  // SUCCESS CASE
  test("should send POST request and return response data", async () => {
    const mockResponse = {
      success: true,
      message: "Invitation accepted",
    };

    // Mock axios POST to return a resolved promise with data
    (api.post as jest.Mock).mockResolvedValue({ data: mockResponse });

    // Call the function being tested
    const result = await acceptInvitation(mockPayload);

    // Ensure POST request was made with correct endpoint + data
    expect(api.post).toHaveBeenCalledWith(
      "/v1/user-management/invitations/accept",
      mockPayload
    );

    // Returned value should match the mock API response
    expect(result).toEqual(mockResponse);
  });

  // FAILURE CASE
  test("should throw error when API fails", async () => {
    const mockError = new Error("Request failed");

    // Simulate axios throwing error
    (api.post as jest.Mock).mockRejectedValue(mockError);

    // Function should forward the error
    await expect(acceptInvitation(mockPayload)).rejects.toThrow("Request failed");

    // Ensure axios was called exactly once
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});

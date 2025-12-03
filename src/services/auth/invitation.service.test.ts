import { api } from "@/lib/axios";
import { acceptInvitation, type AcceptInvitationPayload } from "./invitation.service";

// Mock the axios instance
jest.mock("@/lib/axios", () => ({
  api: {
    post: jest.fn(),
  },
}));

describe("acceptInvitation API", () => {
  const mockPayload: AcceptInvitationPayload = {
    invitation_token: "test-token",
    new_password: "StrongPass123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should send POST request and return response data", async () => {
    const mockResponse = {
      success: true,
      message: "Invitation accepted",
    };

    (api.post as jest.Mock).mockResolvedValue({ data: mockResponse });

    const result = await acceptInvitation(mockPayload);

    // Axios should be called with correct URL & payload
    expect(api.post).toHaveBeenCalledWith(
      "/v1/user-management/invitations/accept",
      mockPayload
    );

    // Function should return the correct data
    expect(result).toEqual(mockResponse);
  });

  test("should throw error when API fails", async () => {
    const mockError = new Error("Request failed");

    (api.post as jest.Mock).mockRejectedValue(mockError);

    await expect(acceptInvitation(mockPayload)).rejects.toThrow("Request failed");

    expect(api.post).toHaveBeenCalledTimes(1);
  });
});

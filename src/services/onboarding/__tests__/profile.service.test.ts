/**
 * @jest-environment jsdom
 *
 * This test suite validates the profile.service module, ensuring:
 * - API requests use correct HTTP methods (POST/PUT)
 * - The correct endpoint paths and payloads are passed
 * - The service functions return expected data formats
 * - Errors thrown by axios are properly propagated
 */

import { api } from "@/lib/axios";
import {
  createProfile,
  updateProfile,
  type CreateProfilePayload,
  type CreateProfileResponse,
} from "../profile.service";

/* --------------------------------------------------------------------------
   MOCK: Axios instance used in the service
   We override `api.post` and `api.put` so no actual API requests occur.
--------------------------------------------------------------------------- */
jest.mock("@/lib/axios", () => ({
  api: {
    post: jest.fn(),
    put: jest.fn(),
  },
}));

describe("profile.service", () => {
  // Shared dummy payload for both createProfile and updateProfile
  const payload: CreateProfilePayload = {
    first_name: "John",
    last_name: "Doe",
    date_of_birth: "2000-01-01",
    additional_info: "Test user",
    role_id: "123",
  };

  beforeEach(() => {
    jest.clearAllMocks(); // Reset mocked methods before each test
  });

  /**
   * TEST: createProfile calls correct endpoint and returns API response
   */
  test("createProfile calls POST with correct URL and payload", async () => {
    const mockResponse: CreateProfileResponse = {
      status: true,
      message: "Profile created",
      data: { id: 1 },
    };

    // Mock axios POST response
    (api.post as jest.Mock).mockResolvedValue({ data: mockResponse });

    const result = await createProfile(payload);

    // Ensure POST is called with expected URL and payload
    expect(api.post).toHaveBeenCalledWith(
      "/v1/onboarding/profile",
      payload
    );

    // Returned value should match API response
    expect(result).toEqual(mockResponse);
  });

  /**
   * TEST: createProfile forwards axios errors
   */
  test("createProfile throws when API rejects", async () => {
    const error = new Error("Network error");
    (api.post as jest.Mock).mockRejectedValue(error);

    // Ensure thrown error is passed upward
    await expect(createProfile(payload)).rejects.toThrow("Network error");
  });

  /**
   * TEST: updateProfile calls correct endpoint and returns proper response
   */
  test("updateProfile calls PUT with correct URL and payload", async () => {
    const mockResponse: CreateProfileResponse = {
      status: true,
      message: "Profile updated",
      data: { id: 1 },
    };

    // Mock axios PUT response
    (api.put as jest.Mock).mockResolvedValue({ data: mockResponse });

    const result = await updateProfile(payload);

    // Ensure PUT is called correctly
    expect(api.put).toHaveBeenCalledWith(
      "/v1/onboarding/profile",
      payload
    );

    expect(result).toEqual(mockResponse);
  });

  /**
   * TEST: updateProfile forwards axios errors
   */
  test("updateProfile throws when API rejects", async () => {
    const error = new Error("Update failed");
    (api.put as jest.Mock).mockRejectedValue(error);

    await expect(updateProfile(payload)).rejects.toThrow("Update failed");
  });
});

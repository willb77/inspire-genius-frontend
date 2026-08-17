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
   * Both functions target user-service, NOT the monolith's
   * `/v1/onboarding/profile` they used to call.
   *
   * That route only exists where a monolith is running — CDK wraps the
   * Strangler-Fig catch-all in `if (isLegacyEnv)`. On staging-b it 404s, and
   * API Gateway's default 404 carries no CORS header, so the browser reported
   * it as a bare "Network Error" and saving a profile failed with a message
   * that pointed at the network instead of a missing route.
   *
   * These assertions guard against a well-meaning revert: pointing either
   * function back at `/v1/onboarding/profile` breaks staging-b again and
   * would otherwise read as a tidy-up.
   */
  test("createProfile PUTs to the user-service endpoint", async () => {
    const mockResponse: CreateProfileResponse = {
      status: true,
      message: "Profile created",
      data: { id: 1 },
    };

    (api.put as jest.Mock).mockResolvedValue({ data: mockResponse });

    const result = await createProfile(payload);

    // Create and update are one upsert on the backend
    // (ON CONFLICT uq_user_profiles_user_id), so both use PUT.
    expect(api.put).toHaveBeenCalledWith("/v1/users/me/profile", payload);
    expect(api.post).not.toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });

  test("createProfile forwards axios errors", async () => {
    const error = new Error("Network error");
    (api.put as jest.Mock).mockRejectedValue(error);

    await expect(createProfile(payload)).rejects.toThrow("Network error");
  });

  test("neither function calls the monolith onboarding route", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: {} });

    await createProfile(payload);
    await updateProfile(payload);

    for (const call of (api.put as jest.Mock).mock.calls) {
      expect(call[0]).not.toBe("/v1/onboarding/profile");
    }
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
    expect(api.put).toHaveBeenCalledWith("/v1/users/me/profile", payload);

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

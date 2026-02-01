/**
 * @jest-environment jsdom
 *
 * This test suite validates the preferences service:
 * - savePreferences uses POST with correct payload
 * - updatePreferences uses PUT with correct agentId
 * - API responses are returned correctly
 * - Axios errors are propagated
 */

import { api } from "@/lib/axios";
import {
  savePreferences,
  updatePreferences,
  type SavePreferencesRequest,
  type UpdatePreferencesRequestBody,
} from "../preferences.service";

/* --------------------------------------------------------------------------
   MOCK: Axios instance
   Prevents real API calls and avoids import.meta.env issues
--------------------------------------------------------------------------- */
jest.mock("@/lib/axios", () => ({
  api: {
    post: jest.fn(),
    put: jest.fn(),
  },
}));

describe("preferences.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ------------------------------------------------------------------------
     savePreferences
  ------------------------------------------------------------------------ */

  test("savePreferences calls POST with correct URL and payload", async () => {
    const payload: SavePreferencesRequest = {
      preferences: [
        {
          agent_id: "agent-1",
          tone_ids: ["t1", "t2"],
          accent_id: "a1",
          gender_id: "g1",
        },
      ],
    };

    const mockResponse = {
      status: true,
      message: "Preferences saved successfully",
      data: null,
    };

    (api.post as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await savePreferences(payload);

    expect(api.post).toHaveBeenCalledWith(
      "/v1/agents-settings/preferences",
      payload
    );

    expect(result).toEqual(mockResponse);
  });

  test("savePreferences throws when API rejects", async () => {
    const payload: SavePreferencesRequest = {
      preferences: [],
    };

    const error = new Error("Save failed");
    (api.post as jest.Mock).mockRejectedValueOnce(error);

    await expect(savePreferences(payload)).rejects.toThrow("Save failed");
  });

  /* ------------------------------------------------------------------------
     updatePreferences
  ------------------------------------------------------------------------ */

  test("updatePreferences calls PUT with correct URL and body", async () => {
    const agentId = "agent-123";

    const body: UpdatePreferencesRequestBody = {
      tone_ids: ["t1"],
      accent_id: "a1",
      gender_id: "g1",
    };

    const mockResponse = {
      status: true,
      message: "Preferences updated",
      data: null,
    };

    (api.put as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await updatePreferences(agentId, body);

    expect(api.put).toHaveBeenCalledWith(
      `/v1/agents-settings/preferences/${agentId}`,
      body
    );

    expect(result).toEqual(mockResponse);
  });

  test("updatePreferences throws when API rejects", async () => {
    const agentId = "agent-123";

    const body: UpdatePreferencesRequestBody = {
      tone_ids: [],
      accent_id: "",
      gender_id: "",
    };

    const error = new Error("Update failed");
    (api.put as jest.Mock).mockRejectedValueOnce(error);

    await expect(updatePreferences(agentId, body)).rejects.toThrow(
      "Update failed"
    );
  });
});

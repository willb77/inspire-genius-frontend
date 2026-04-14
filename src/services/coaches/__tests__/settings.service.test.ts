/**
 * @jest-environment jsdom
 *
 * This test suite validates agent settings services:
 * - getAgentSetting calls correct endpoint
 * - Wrapper functions (getTones, getAccents, getGenders) use correct segments
 * - API responses are returned correctly
 * - Axios errors are propagated
 */

import { api } from "@/lib/axios";
import {
  getAgentSetting,
  getTones,
  getAccents,
  getGenders,
} from "../settings.service";

/* --------------------------------------------------------------------------
   MOCK: Axios instance
   Prevents real API calls and avoids import.meta.env issues
--------------------------------------------------------------------------- */
jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn(),
  },
}));

describe("agentSettings.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ------------------------------------------------------------------------
     getAgentSetting
  ------------------------------------------------------------------------ */

  test("getAgentSetting calls GET with correct segment and returns data", async () => {
    const mockResponse = {
      status: true,
      message: "Fetched successfully",
      data: [{ id: "1", name: "Sample" }],
    };

    (api.get as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await getAgentSetting("tone");

    expect(api.get).toHaveBeenCalledWith("/v1/agents-settings/tone");
    expect(result).toEqual(mockResponse);
  });

  test("getAgentSetting works with custom segment", async () => {
    const mockResponse = {
      status: true,
      data: { custom: true },
    };

    (api.get as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await getAgentSetting("custom-segment");

    expect(api.get).toHaveBeenCalledWith(
      "/v1/agents-settings/custom-segment"
    );
    expect(result).toEqual(mockResponse);
  });

  test("getAgentSetting throws when API rejects", async () => {
    const error = new Error("Network error");
    (api.get as jest.Mock).mockRejectedValueOnce(error);

    await expect(getAgentSetting("tone")).rejects.toThrow("Network error");
  });

  /* ------------------------------------------------------------------------
     Wrapper functions
  ------------------------------------------------------------------------ */

  test("getTones calls getAgentSetting with 'tone'", async () => {
    const mockResponse = { status: true, data: [] };

    (api.get as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await getTones();

    expect(api.get).toHaveBeenCalledWith("/v1/agents-settings/tone");
    expect(result).toEqual(mockResponse);
  });

  test("getAccents calls getAgentSetting with 'accent'", async () => {
    const mockResponse = { status: true, data: [] };

    (api.get as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await getAccents();

    expect(api.get).toHaveBeenCalledWith("/v1/agents-settings/accent");
    expect(result).toEqual(mockResponse);
  });

  test("getGenders calls getAgentSetting with 'gender'", async () => {
    const mockResponse = { status: true, data: [] };

    (api.get as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await getGenders();

    expect(api.get).toHaveBeenCalledWith("/v1/agents-settings/gender");
    expect(result).toEqual(mockResponse);
  });
});

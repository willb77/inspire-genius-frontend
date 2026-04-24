/**
 * @jest-environment jsdom
 *
 * This test suite validates agent settings services:
 * - getAgentSetting calls correct endpoint
 * - Wrapper functions (getTones, getAccents, getGenders) use correct segments
 * - API responses are returned correctly
 * - Axios errors are propagated
 */

import {
  getAgentSetting,
  getTones,
  getAccents,
  getGenders,
} from "../settings.service";

/* --------------------------------------------------------------------------
   MOCK: agentApi instance (settings.service now uses getApi())
--------------------------------------------------------------------------- */
jest.mock("@/lib/agentApi", () => {
  const _get = jest.fn();
  return {
    __esModule: true,
    getApi: jest.fn(() => ({ get: _get })),
    agentApi: { get: _get, defaults: { headers: { common: {} } } },
    useAgentEngine: jest.fn().mockReturnValue(false),
    syncAuthToken: jest.fn(),
  };
});

import { getApi } from "@/lib/agentApi";
const mockGet = (getApi as jest.Mock)().get as jest.Mock;

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

    mockGet.mockResolvedValueOnce({ data: mockResponse });

    const result = await getAgentSetting("tone");

    expect(mockGet).toHaveBeenCalledWith("/v1/agents-settings/tone");
    expect(result).toEqual(mockResponse);
  });

  test("getAgentSetting works with custom segment", async () => {
    const mockResponse = {
      status: true,
      data: { custom: true },
    };

    mockGet.mockResolvedValueOnce({ data: mockResponse });

    const result = await getAgentSetting("custom-segment");

    expect(mockGet).toHaveBeenCalledWith("/v1/agents-settings/custom-segment");
    expect(result).toEqual(mockResponse);
  });

  test("getAgentSetting throws when API rejects", async () => {
    const error = new Error("Network error");
    mockGet.mockRejectedValueOnce(error);

    await expect(getAgentSetting("tone")).rejects.toThrow("Network error");
  });

  /* ------------------------------------------------------------------------
     Wrapper functions
  ------------------------------------------------------------------------ */

  test("getTones calls getAgentSetting with 'tone'", async () => {
    const mockResponse = { status: true, data: [] };
    mockGet.mockResolvedValueOnce({ data: mockResponse });

    const result = await getTones();

    expect(mockGet).toHaveBeenCalledWith("/v1/agents-settings/tone");
    expect(result).toEqual(mockResponse);
  });

  test("getAccents calls getAgentSetting with 'accent'", async () => {
    const mockResponse = { status: true, data: [] };
    mockGet.mockResolvedValueOnce({ data: mockResponse });

    const result = await getAccents();

    expect(mockGet).toHaveBeenCalledWith("/v1/agents-settings/accent");
    expect(result).toEqual(mockResponse);
  });

  test("getGenders calls getAgentSetting with 'gender'", async () => {
    const mockResponse = { status: true, data: [] };
    mockGet.mockResolvedValueOnce({ data: mockResponse });

    const result = await getGenders();

    expect(mockGet).toHaveBeenCalledWith("/v1/agents-settings/gender");
    expect(result).toEqual(mockResponse);
  });
});

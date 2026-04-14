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
   MOCK: agentApi's getApi() returns a mock axios instance
--------------------------------------------------------------------------- */
const mockAxios = {
  get: jest.fn(),
};

jest.mock("@/lib/agentApi", () => ({
  getApi: () => mockAxios,
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

    mockAxios.get.mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await getAgentSetting("tone");

    expect(mockAxios.get).toHaveBeenCalledWith("/v1/agents-settings/tone");
    expect(result).toEqual(mockResponse);
  });

  test("getAgentSetting works with custom segment", async () => {
    const mockResponse = {
      status: true,
      data: { custom: true },
    };

    mockAxios.get.mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await getAgentSetting("custom-segment");

    expect(mockAxios.get).toHaveBeenCalledWith(
      "/v1/agents-settings/custom-segment"
    );
    expect(result).toEqual(mockResponse);
  });

  test("getAgentSetting throws when API rejects", async () => {
    const error = new Error("Network error");
    mockAxios.get.mockRejectedValueOnce(error);

    await expect(getAgentSetting("tone")).rejects.toThrow("Network error");
  });

  /* ------------------------------------------------------------------------
     Wrapper functions
  ------------------------------------------------------------------------ */

  test("getTones calls getAgentSetting with 'tone'", async () => {
    const mockResponse = { status: true, data: [] };

    mockAxios.get.mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await getTones();

    expect(mockAxios.get).toHaveBeenCalledWith("/v1/agents-settings/tone");
    expect(result).toEqual(mockResponse);
  });

  test("getAccents calls getAgentSetting with 'accent'", async () => {
    const mockResponse = { status: true, data: [] };

    mockAxios.get.mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await getAccents();

    expect(mockAxios.get).toHaveBeenCalledWith("/v1/agents-settings/accent");
    expect(result).toEqual(mockResponse);
  });

  test("getGenders calls getAgentSetting with 'gender'", async () => {
    const mockResponse = { status: true, data: [] };

    mockAxios.get.mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await getGenders();

    expect(mockAxios.get).toHaveBeenCalledWith("/v1/agents-settings/gender");
    expect(result).toEqual(mockResponse);
  });
});

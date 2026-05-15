/**
 * @jest-environment jsdom
 *
 * This test suite validates the getAgents service:
 * - Correct endpoint and params are used
 * - API response data is returned correctly
 * - Axios errors are propagated
 */

import { getAgents, type AgentsQuery } from "../agents.service";

/* --------------------------------------------------------------------------
   MOCK: agentApi's getApi() returns a mock axios instance
--------------------------------------------------------------------------- */
const mockAxios = {
  get: jest.fn(),
};

jest.mock("@/lib/agentApi", () => ({
  getApi: () => mockAxios,
}));

describe("getAgents service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("calls GET with correct URL and params and returns data", async () => {
    const params: AgentsQuery = {
      page: 1,
      page_size: 10,
    };

    const mockResponse = {
      status: true,
      message: "Agents fetched successfully",
      data: [{ id: "1", name: "Coach Alpha" }],
    };

    mockAxios.get.mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await getAgents(params);

    expect(mockAxios.get).toHaveBeenCalledWith(
      "/v1/agents-settings/agents",
      { params }
    );

    expect(result).toEqual(mockResponse);
  });

  test("returns undefined when API returns no data", async () => {
    const params: AgentsQuery = {
      page: 2,
      page_size: 5,
    };

    mockAxios.get.mockResolvedValueOnce({
      data: undefined,
    });

    const result = await getAgents(params);

    expect(result).toBeUndefined();
  });

  test("throws error when API call fails", async () => {
    const params: AgentsQuery = {
      page: 1,
      page_size: 10,
    };

    const error = new Error("Network error");
    mockAxios.get.mockRejectedValueOnce(error);

    await expect(getAgents(params)).rejects.toThrow("Network error");

    expect(mockAxios.get).toHaveBeenCalledWith(
      "/v1/agents-settings/agents",
      { params }
    );
  });
});

/**
 * @jest-environment jsdom
 *
 * This test suite validates the getAgents service:
 * - Correct endpoint and params are used
 * - API response data is returned correctly
 * - Axios errors are propagated
 */

import { api } from "@/lib/axios";
import { getAgents, type AgentsQuery } from "../agents.service";

/* --------------------------------------------------------------------------
   MOCK: Axios instance
   Prevents real API calls and avoids import.meta.env issues
--------------------------------------------------------------------------- */
jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn(),
  },
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

    // Mock axios GET response
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await getAgents(params);

    // Validate axios call
    expect(api.get).toHaveBeenCalledWith(
      "/v1/agents-settings/agents",
      { params }
    );

    // Validate returned data
    expect(result).toEqual(mockResponse);
  });

  test("returns undefined when API returns no data", async () => {
    const params: AgentsQuery = {
      page: 2,
      page_size: 5,
    };

    (api.get as jest.Mock).mockResolvedValueOnce({
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
    (api.get as jest.Mock).mockRejectedValueOnce(error);

    await expect(getAgents(params)).rejects.toThrow("Network error");

    expect(api.get).toHaveBeenCalledWith(
      "/v1/agents-settings/agents",
      { params }
    );
  });
});

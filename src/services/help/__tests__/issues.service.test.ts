/**
 * @jest-environment jsdom
 */

import { api } from "@/lib/axios";
import {
  getIssueTypes,
  createIssue,
  getIssues,
  type GetIssueTypesResponse,
  type CreateIssueResponse,
  type GetIssuesResponse,
} from "@/services/help/issues.service";

// --------------------
// Mock axios instance
// --------------------
jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe("Issues Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ====================
  // getIssueTypes
  // ====================
  describe("getIssueTypes", () => {
    it("calls correct endpoint and returns data", async () => {
      const mockResponse: GetIssueTypesResponse = {
        status: true,
        data: [
          { id: "1", name: "Bug" },
          { id: "2", name: "Feature" },
        ],
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await getIssueTypes();

      expect(api.get).toHaveBeenCalledWith("/v1/issues/types");
      expect(result).toEqual(mockResponse);
    });

    it("throws error when API fails", async () => {
      const error = new Error("Network error");

      (api.get as jest.Mock).mockRejectedValueOnce(error);

      await expect(getIssueTypes()).rejects.toThrow("Network error");
    });
  });

  // ====================
  // createIssue
  // ====================
  describe("createIssue", () => {
    it("posts form data with correct headers", async () => {
      const formData = new FormData();

      const mockResponse: CreateIssueResponse = {
        status: true,
        message: "Issue created successfully",
      };

      (api.post as jest.Mock).mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await createIssue(formData);

      expect(api.post).toHaveBeenCalledWith(
        "/v1/issues/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it("throws error when API fails", async () => {
      const error = new Error("Failed to create issue");

      (api.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(createIssue(new FormData())).rejects.toThrow(
        "Failed to create issue"
      );
    });
  });

  // ====================
  // getIssues
  // ====================
  describe("getIssues", () => {
    it("calls correct endpoint with params and returns data", async () => {
      const params = { page: 1, page_size: 10 };

      const mockResponse: GetIssuesResponse = {
        status: true,
        data: {
          items: [],
          page: 1,
          page_size: 10,
          total: 0,
        },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await getIssues(params);

      expect(api.get).toHaveBeenCalledWith(
        "/v1/issues/",
        { params }
      );

      expect(result).toEqual(mockResponse);
    });

    it("throws error when API fails", async () => {
      const error = new Error("Failed to fetch issues");

      (api.get as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        getIssues({ page: 1, page_size: 10 })
      ).rejects.toThrow("Failed to fetch issues");
    });
  });
});

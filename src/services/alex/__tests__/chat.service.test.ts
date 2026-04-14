import { api } from "@/lib/axios";
import {
  getAlexDeviceId,
  getAlexHistoryList,
  downloadAlexChat,
  type AlexDeviceIdResponse,
  type AlexHistoryListParams,
  type AlexDownloadParams,
  type AlexDownloadResponse,
} from "../chat.service";

// Mock the axios instance
jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = jest.mocked(api);

describe("getAlexDeviceId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch device ID and normalize device_id from data.data.device_id", async () => {
    const mockResponse: AlexDeviceIdResponse = {
      status: true,
      success: true,
      message: "Success",
      data: {
        device_id: "device-123",
      },
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    const result = await getAlexDeviceId();

    expect(mockedApi.get).toHaveBeenCalledWith("/v1/chat/AlexChat/device-id");
    expect(result).toEqual({
      ...mockResponse,
      device_id: "device-123",
    });
  });

  it("should normalize deviceId to device_id from data.data.deviceId", async () => {
    const mockResponse: AlexDeviceIdResponse = {
      status: true,
      success: true,
      message: "Success",
      data: {
        deviceId: "device-456",
      },
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    const result = await getAlexDeviceId();

    expect(result.device_id).toBe("device-456");
  });

  it("should handle device_id at root level", async () => {
    const mockResponse = {
      status: true,
      success: true,
      message: "Success",
      device_id: "device-789",
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    const result = await getAlexDeviceId();

    expect(result.device_id).toBe("device-789");
  });

  it("should return empty string when no device_id is found", async () => {
    const mockResponse: AlexDeviceIdResponse = {
      status: true,
      success: true,
      message: "Success",
      data: {},
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    const result = await getAlexDeviceId();

    expect(result.device_id).toBe("");
  });

  it("should handle API errors", async () => {
    const mockError = new Error("Network error");
    mockedApi.get.mockRejectedValue(mockError);

    await expect(getAlexDeviceId()).rejects.toThrow("Network error");
    expect(mockedApi.get).toHaveBeenCalledWith("/v1/chat/AlexChat/device-id");
  });

  it("should convert non-string device_id to string", async () => {
    const mockResponse: AlexDeviceIdResponse = {
      status: true,
      success: true,
      message: "Success",
      data: {
        device_id: 12345 as any,
      },
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    const result = await getAlexDeviceId();

    expect(result.device_id).toBe("12345");
    expect(typeof result.device_id).toBe("string");
  });
});

describe("getAlexHistoryList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch history list with default parameters", async () => {
    const mockResponse = {
      status: true,
      success: true,
      data: {
        items: [],
        total: 0,
      },
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    const result = await getAlexHistoryList();

    expect(mockedApi.get).toHaveBeenCalledWith("/v1/chat/AlexChat/history", {
      params: {
        limit: 100,
        offset: 0,
        device_key: undefined,
      },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should fetch history list with custom parameters", async () => {
    const mockResponse = {
      status: true,
      success: true,
      data: {
        items: [
          { id: 1, message: "Hello" },
          { id: 2, message: "World" },
        ],
        total: 2,
      },
    };

    const params: AlexHistoryListParams = {
      limit: 50,
      offset: 10,
      device_key: "device-abc",
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    const result = await getAlexHistoryList(params);

    expect(mockedApi.get).toHaveBeenCalledWith("/v1/chat/AlexChat/history", {
      params: {
        limit: 50,
        offset: 10,
        device_key: "device-abc",
      },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle partial parameters", async () => {
    const mockResponse = {
      status: true,
      success: true,
      data: { items: [], total: 0 },
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    await getAlexHistoryList({ limit: 25 });

    expect(mockedApi.get).toHaveBeenCalledWith("/v1/chat/AlexChat/history", {
      params: {
        limit: 25,
        offset: 0,
        device_key: undefined,
      },
    });
  });

  it("should handle API errors", async () => {
    const mockError = new Error("Failed to fetch history");
    mockedApi.get.mockRejectedValue(mockError);

    await expect(getAlexHistoryList()).rejects.toThrow("Failed to fetch history");
  });

  it("should handle empty response", async () => {
    const mockResponse = {
      status: true,
      data: null,
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    const result = await getAlexHistoryList();

    expect(result).toEqual(mockResponse);
  });
});

describe("downloadAlexChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should download chat with required parameters", async () => {
    const mockResponse: AlexDownloadResponse = {
      status: true,
      message: "Success",
      base64_pdf: "base64pdfdata",
      base64_csv: "base64csvdata",
      mime_type: "application/pdf",
      file_name: "chat_export.pdf",
    };

    const params: AlexDownloadParams = {
      device_key: "device-123",
      start_date: "2024-01-01",
      end_date: "2024-01-31",
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    const result = await downloadAlexChat(params);

    expect(mockedApi.get).toHaveBeenCalledWith("/v1/chat/AlexChat/download", {
      params,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should download chat with all optional parameters", async () => {
    const mockResponse: AlexDownloadResponse = {
      status: true,
      message: "Success",
      data: {
        base64_pdf: "base64pdfdata",
        base64_csv: "base64csvdata",
        mime_type: "text/csv",
        file_name: "chat_export.csv",
      },
    };

    const params: AlexDownloadParams = {
      device_key: "device-456",
      start_date: "2024-01-01",
      end_date: "2024-01-31",
      timezone: "America/New_York",
      limit: 1000,
      offset: 0,
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    const result = await downloadAlexChat(params);

    expect(mockedApi.get).toHaveBeenCalledWith("/v1/chat/AlexChat/download", {
      params,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle response with data nested in data object", async () => {
    const mockResponse: AlexDownloadResponse = {
      status: true,
      message: "Export generated",
      data: {
        base64_pdf: "nestedpdfdata",
        mime_type: "application/pdf",
        file_name: "export.pdf",
      },
    };

    const params: AlexDownloadParams = {
      device_key: "device-789",
      start_date: "2024-02-01",
      end_date: "2024-02-28",
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    const result = await downloadAlexChat(params);

    expect(result.data).toEqual({
      base64_pdf: "nestedpdfdata",
      mime_type: "application/pdf",
      file_name: "export.pdf",
    });
  });

  it("should handle API errors", async () => {
    const mockError = new Error("Download failed");
    const params: AlexDownloadParams = {
      device_key: "device-error",
      start_date: "2024-01-01",
      end_date: "2024-01-31",
    };

    mockedApi.get.mockRejectedValue(mockError);

    await expect(downloadAlexChat(params)).rejects.toThrow("Download failed");
    expect(mockedApi.get).toHaveBeenCalledWith("/v1/chat/AlexChat/download", {
      params,
    });
  });

  it("should handle invalid date format gracefully", async () => {
    const mockResponse: AlexDownloadResponse = {
      status: false,
      message: "Invalid date format",
    };

    const params: AlexDownloadParams = {
      device_key: "device-123",
      start_date: "invalid-date",
      end_date: "2024-01-31",
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    const result = await downloadAlexChat(params);

    expect(result.status).toBe(false);
    expect(result.message).toBe("Invalid date format");
  });

  it("should pass timezone parameter correctly", async () => {
    const mockResponse: AlexDownloadResponse = {
      status: true,
      message: "Success",
    };

    const params: AlexDownloadParams = {
      device_key: "device-123",
      start_date: "2024-01-01",
      end_date: "2024-01-31",
      timezone: "Asia/Kolkata",
    };

    mockedApi.get.mockResolvedValue({ data: mockResponse });

    await downloadAlexChat(params);

    expect(mockedApi.get).toHaveBeenCalledWith("/v1/chat/AlexChat/download", {
      params: expect.objectContaining({
        timezone: "Asia/Kolkata",
      }),
    });
  });
});

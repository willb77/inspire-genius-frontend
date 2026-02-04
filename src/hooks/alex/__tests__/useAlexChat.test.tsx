import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAlexDeviceId, useAlexHistoryList, useAlexHistoryListOnce } from "../useAlexChat";
import { getAlexDeviceId, getAlexHistoryList } from "@/services/alex/chat.service";

// Mock the axios library
jest.mock("@/lib/axios", () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock the chat service
jest.mock("@/services/alex/chat.service");

// Use jest.mocked for type-safe mocking
const mockedGetAlexDeviceId = jest.mocked(getAlexDeviceId);
const mockedGetAlexHistoryList = jest.mocked(getAlexHistoryList);

// Helper function to create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useAlexDeviceId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch device ID when enabled is true", async () => {
    const mockDeviceId = {
      device_id: "device-123",
      status: true,
      success: true,
      message: "Success",
    };
    mockedGetAlexDeviceId.mockResolvedValue(mockDeviceId);

    const { result } = renderHook(() => useAlexDeviceId(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetAlexDeviceId).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockDeviceId);
  });

  it("should not fetch device ID when enabled is false", () => {
    const { result } = renderHook(() => useAlexDeviceId(false), {
      wrapper: createWrapper(),
    });

    expect(mockedGetAlexDeviceId).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it("should handle errors", async () => {
    const mockError = new Error("Failed to fetch device ID");
    mockedGetAlexDeviceId.mockRejectedValue(mockError);

    const { result } = renderHook(() => useAlexDeviceId(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(mockError);
  });
});

describe("useAlexHistoryList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch history list with default params when enabled is true", async () => {
    const mockHistory = {
      status: true,
      success: true,
      message: "Success",
      data: {
        items: [],
        total: 0,
      },
    };
    mockedGetAlexHistoryList.mockResolvedValue(mockHistory);

    const { result } = renderHook(() => useAlexHistoryList(undefined, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetAlexHistoryList).toHaveBeenCalledWith({ limit: 100, offset: 0 });
    expect(result.current.data).toEqual(mockHistory);
  });

  it("should fetch history list with custom params", async () => {
    const mockHistory = {
      status: true,
      success: true,
      message: "Success",
      data: {
        items: [],
        total: 0,
      },
    };
    const customParams = { limit: 50, offset: 10 };
    mockedGetAlexHistoryList.mockResolvedValue(mockHistory);

    const { result } = renderHook(() => useAlexHistoryList(customParams, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetAlexHistoryList).toHaveBeenCalledWith(customParams);
  });

  it("should not fetch when enabled is false", () => {
    const { result } = renderHook(() => useAlexHistoryList(), {
      wrapper: createWrapper(),
    });

    expect(mockedGetAlexHistoryList).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});

describe("useAlexHistoryListOnce", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch history list when mutate is called", async () => {
    const mockHistory = {
      status: true,
      success: true,
      message: "Success",
      data: {
        items: [],
        total: 0,
      },
    };
    const params = { limit: 20, offset: 5 };
    mockedGetAlexHistoryList.mockResolvedValue(mockHistory);

    const { result } = renderHook(() => useAlexHistoryListOnce(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(params);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetAlexHistoryList).toHaveBeenCalledWith(params);
    expect(result.current.data).toEqual(mockHistory);
  });

  it("should handle mutation errors", async () => {
    const mockError = new Error("Failed to fetch history");
    mockedGetAlexHistoryList.mockRejectedValue(mockError);

    const { result } = renderHook(() => useAlexHistoryListOnce(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ limit: 100, offset: 0 });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(mockError);
  });
});
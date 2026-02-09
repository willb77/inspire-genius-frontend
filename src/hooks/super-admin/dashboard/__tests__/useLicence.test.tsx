import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLicence } from "../useLicence";
import { getLicenses } from "@/services/super-admin/dashboard/licence.service";

/* -------------------------------------------------
 MOCK SERVICE
------------------------------------------------- */
jest.mock("@/services/super-admin/dashboard/licence.service", () => ({
  getLicenses: jest.fn(),
}));

/* -------------------------------------------------
 QUERY WRAPPER
------------------------------------------------- */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockResponse = {
  licenses: [],
  page: 1,
  limit: 10,
  total: 0,
};

/* -------------------------------------------------
 TESTS
------------------------------------------------- */
describe("useLicence hook", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("fetches licenses with default params", async () => {
    (getLicenses as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useLicence(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getLicenses).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(result.current.data).toEqual(mockResponse);
  });

  it("fetches licenses with custom params", async () => {
    (getLicenses as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useLicence({ page: 2, limit: 5 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getLicenses).toHaveBeenCalledWith({ page: 2, limit: 5 });
    expect(result.current.data).toEqual(mockResponse);
  });

  it("respects react-query options (enabled: false)", () => {
    (getLicenses as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () =>
        useLicence(
          { page: 1, limit: 10 },
          { enabled: false } as any
        ),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });
});

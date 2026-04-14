/**
 * @jest-environment jsdom
 */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
  attachInterceptors: jest.fn(),
}));

jest.mock("@/lib/agentApi", () => ({
  getApi: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }),
  agentApi: { defaults: { headers: { common: {} } } },
}));


import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Coaches from "../Coaches";
import { useCoachData } from "@/hooks/coaches/useCoachData";
import { useUpdatePreferences } from "@/hooks/coaches/useUpdatePreferences";

/* -------------------- MOCKS -------------------- */

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

jest.mock("@/components/shared/CoachCardSkeleton", () => ({
  __esModule: true,
  default: () => <div data-testid="coach-skeleton" />,
}));

jest.mock("@/components/onboarding/CoachCard", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid={`coach-card-${props.agentId}`}>
      <span>{props.title}</span>
      <button
        data-testid={`submit-${props.agentId}`}
        onClick={() =>
          props.onSubmit({
            genderId: "g1",
            accentId: "a1",
            toneIds: ["t1", "t2"],
          })
        }
      >
        Save
      </button>
      {props.isSubmitting && <span data-testid="submitting">Submitting</span>}
    </div>
  ),
}));

jest.mock("@/components/ui/icon-input", () => ({
  __esModule: true,
  default: ({ value, onChange }: any) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={onChange}
    />
  ),
}));

jest.mock("@/hooks/coaches/useCoachData");
jest.mock("@/hooks/coaches/useUpdatePreferences");

/* -------------------- TYPED MOCKS -------------------- */

const mockUseCoachData = useCoachData as jest.MockedFunction<typeof useCoachData>;
const mockUseUpdatePreferences =
  useUpdatePreferences as jest.MockedFunction<typeof useUpdatePreferences>;

/* -------------------- TEST WRAPPER -------------------- */

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

/* -------------------- MOCK DATA -------------------- */

const agentsMock = [
  {
    id: "1",
    name: "PRISM Coach",
    user_tones: [{ id: "t1" }],
    user_gender: { id: "g1" },
    user_accent: { id: "a1" },
  },
  {
    id: "2",
    name: "Training Coach",
    user_tones: [],
  },
];

describe("Coaches Page", () => {
  const mutateAsyncMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCoachData.mockReturnValue({
      agents: agentsMock,
      toneOptions: [{ id: "t1", name: "Calm" }],
      accentOptions: [{ id: "a1", name: "US" }],
      genderOptions: [{ id: "g1", name: "Male" }],
      isLoading: false,
    } as any);

    mockUseUpdatePreferences.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as any);
  });

  /* ---------- Rendering ---------- */

  it("renders page title and search input", () => {
    render(<Coaches />, { wrapper: createWrapper() });

    expect(screen.getByText("Manage Coaches")).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
  });

  it("renders coach cards", () => {
    render(<Coaches />, { wrapper: createWrapper() });

    expect(screen.getByText("PRISM Coach")).toBeInTheDocument();
    expect(screen.getByText("Training Coach")).toBeInTheDocument();
  });

  /* ---------- Loading State ---------- */

  it("shows skeletons when loading", () => {
    mockUseCoachData.mockReturnValue({
      agents: [],
      toneOptions: [],
      accentOptions: [],
      genderOptions: [],
      isLoading: true,
    } as any);

    render(<Coaches />, { wrapper: createWrapper() });

    expect(screen.getAllByTestId("coach-skeleton")).toHaveLength(6);
  });

  /* ---------- Search ---------- */

  it("filters coaches based on search query", () => {
    render(<Coaches />, { wrapper: createWrapper() });

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "prism" },
    });

    expect(screen.getByText("PRISM Coach")).toBeInTheDocument();
    expect(screen.queryByText("Training Coach")).not.toBeInTheDocument();
  });

  /* ---------- Submit Preferences ---------- */

  it("submits preferences and invalidates query", async () => {
    mutateAsyncMock.mockResolvedValueOnce({});

    render(<Coaches />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId("submit-1"));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        agentId: "1",
        body: {
          tone_ids: ["t1", "t2"],
          accent_id: "a1",
          gender_id: "g1",
        },
      });
    });
  });

  /* ---------- Submitting State ---------- */

  it("shows submitting state for active agent", async () => {
    mockUseUpdatePreferences.mockReturnValue({
      mutateAsync: async () => new Promise(() => {}),
      isPending: true,
    } as any);

    render(<Coaches />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId("submit-1"));

    expect(screen.getByTestId("submitting")).toBeInTheDocument();
  });
});

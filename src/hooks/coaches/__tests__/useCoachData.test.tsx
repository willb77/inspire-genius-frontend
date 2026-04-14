/**
 * @jest-environment jsdom
 */

/* --------------------------------------------------------------------------
   MOCK axios FIRST (before any imports)
   This prevents Jest from ever loading src/lib/axios.ts
--------------------------------------------------------------------------- */
jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
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

import { renderHook } from "@testing-library/react";
import { useCoachData } from "../useCoachData";
import { useAgents } from "@/hooks/coaches/useAgents";
import { useTones } from "@/hooks/coaches/useTones";
import { useAccents } from "@/hooks/coaches/useAccents";
import { useGenders } from "@/hooks/coaches/useGenders";

/* --------------------------------------------------------------------------
   MOCK DEPENDENT HOOKS
--------------------------------------------------------------------------- */
jest.mock("@/hooks/coaches/useAgents");
jest.mock("@/hooks/coaches/useTones");
jest.mock("@/hooks/coaches/useAccents");
jest.mock("@/hooks/coaches/useGenders");

const mockUseAgents = useAgents as jest.MockedFunction<typeof useAgents>;
const mockUseTones = useTones as jest.MockedFunction<typeof useTones>;
const mockUseAccents = useAccents as jest.MockedFunction<typeof useAccents>;
const mockUseGenders = useGenders as jest.MockedFunction<typeof useGenders>;

describe("useCoachData hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns mapped agents and options correctly", () => {
    mockUseAgents.mockReturnValue({
      data: {
        data: {
          agents: [
            {
              id: "1",
              name: "Coach Alpha",
              user_gender: { id: "g1", name: "Male" },
              user_accent: { id: "a1", name: "US" },
              user_tones: [{ id: "t1", name: "Calm" }],
            },
          ],
        },
      },
      isLoading: false,
    } as any);

    mockUseTones.mockReturnValue({
      data: {
        data: {
          Tones: [{ id: "t1", name: "Calm" }],
        },
      },
      isLoading: false,
    } as any);

    mockUseAccents.mockReturnValue({
      data: {
        data: {
          Tones: [{ id: "a1", name: "US" }],
        },
      },
      isLoading: false,
    } as any);

    mockUseGenders.mockReturnValue({
      data: {
        data: {
          Genders: [{ id: "g1", name: "Male" }],
        },
      },
      isLoading: false,
    } as any);

    const { result } = renderHook(() =>
      useCoachData({ page: 1, page_size: 10 })
    );

    expect(result.current.agents).toHaveLength(1);
    expect(result.current.agents[0].name).toBe("Coach Alpha");

    expect(result.current.toneOptions).toEqual([
      { label: "Calm", value: "t1" },
    ]);

    expect(result.current.accentOptions).toEqual([
      { label: "US", value: "a1" },
    ]);

    expect(result.current.genderOptions).toEqual([
      { label: "Male", value: "g1" },
    ]);

    expect(result.current.isLoading).toBe(false);
  });

  test("returns empty arrays when responses are missing", () => {
    mockUseAgents.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    mockUseTones.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    mockUseAccents.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    mockUseGenders.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    const { result } = renderHook(() =>
      useCoachData({ page: 1, page_size: 10 })
    );

    expect(result.current.agents).toEqual([]);
    expect(result.current.toneOptions).toEqual([]);
    expect(result.current.accentOptions).toEqual([]);
    expect(result.current.genderOptions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  test("isLoading is true if any dependent hook is loading", () => {
    mockUseAgents.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    mockUseTones.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    mockUseAccents.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    mockUseGenders.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    const { result } = renderHook(() =>
      useCoachData({ page: 1, page_size: 10 })
    );

    expect(result.current.isLoading).toBe(true);
  });
});

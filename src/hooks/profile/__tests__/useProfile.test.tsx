/**
 * @jest-environment jsdom
 */

import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  useCreateFact,
  useMyProfile,
  profileKeys,
} from "@/hooks/profile/useProfile";
import {
  createFact,
  getMyProfile,
} from "@/services/profile/profile";
import type { ProfileMe } from "@/types/profile/profile-types";

jest.mock("@/services/profile/profile", () => ({
  getMyProfile: jest.fn(),
  createFact: jest.fn(),
}));

const SAMPLE: ProfileMe = {
  user_id: "u-1",
  facts: [
    {
      id: "f-1",
      category: "bio",
      key: "summary",
      value: "I run product at a healthcare SaaS.",
      source: "user_input",
    },
  ],
  loaded_frameworks: ["PRISM"],
};

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
      mutations: { retry: false },
    },
  });
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => jest.clearAllMocks());

describe("useMyProfile", () => {
  it("returns the profile snapshot on success", async () => {
    (getMyProfile as jest.Mock).mockResolvedValueOnce(SAMPLE);
    const client = makeClient();
    const { result } = renderHook(() => useMyProfile(), {
      wrapper: wrap(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(SAMPLE);
    expect(getMyProfile).toHaveBeenCalledTimes(1);
  });
});

describe("useCreateFact", () => {
  it("invalidates the profile snapshot on success", async () => {
    (getMyProfile as jest.Mock).mockResolvedValue(SAMPLE);
    (createFact as jest.Mock).mockResolvedValueOnce({
      id: "f-2",
      category: "career",
      key: "current_role",
      value: "Senior PM",
      source: "user_input",
    });

    const client = makeClient();
    // Seed the cache so we can observe invalidation.
    client.setQueryData(profileKeys.me(), SAMPLE);
    const initial = client.getQueryState(profileKeys.me());
    expect(initial?.data).toEqual(SAMPLE);

    const { result } = renderHook(() => useCreateFact(), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        category: "career",
        key: "current_role",
        value: "Senior PM",
      });
    });

    expect(createFact).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "career",
        key: "current_role",
        value: "Senior PM",
      }),
    );
    // After mutation, the snapshot query should be marked invalidated.
    const post = client.getQueryState(profileKeys.me());
    expect(post?.isInvalidated).toBe(true);
  });
});

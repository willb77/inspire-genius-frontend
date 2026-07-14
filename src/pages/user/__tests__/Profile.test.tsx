/**
 * @jest-environment jsdom
 */

import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import Profile from "@/pages/user/Profile";
import {
  getMyProfile,
  listAssessments,
} from "@/services/profile/profile";
import type { Assessment, ProfileMe } from "@/types/profile/profile-types";

jest.mock("@/services/profile/profile", () => ({
  getMyProfile: jest.fn(),
  listAssessments: jest.fn(),
  getTrend: jest.fn().mockResolvedValue({
    framework: "PRISM",
    dimension: "Innovating",
    points: [],
  }),
  getLoadedFrameworks: jest.fn().mockResolvedValue([]),
}));

// UserLayout pulls in AuthContext + i18n + Sidebar — stub it for unit tests.
jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

function renderProfile() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <Profile />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => jest.clearAllMocks());

test("renders the page header and the empty state when no data", async () => {
  (getMyProfile as jest.Mock).mockResolvedValueOnce({
    user_id: "u-1",
    facts: [],
    loaded_frameworks: [],
  } as ProfileMe);
  (listAssessments as jest.Mock).mockResolvedValueOnce({
    assessments: [],
    total: 0,
    limit: 100,
    offset: 0,
  });

  renderProfile();

  expect(
    screen.getByRole("heading", { name: /^profile$/i, level: 1 }),
  ).toBeInTheDocument();

  await waitFor(() => {
    expect(
      screen.getByText(/no assessments yet/i),
    ).toBeInTheDocument();
  });
});

test("renders timeline cards when assessments are present", async () => {
  (getMyProfile as jest.Mock).mockResolvedValueOnce({
    user_id: "u-1",
    facts: [
      {
        id: "f-1",
        category: "bio",
        key: "summary",
        value: "I run product.",
      },
    ],
    loaded_frameworks: ["PRISM"],
  } as ProfileMe);

  const assessments: Assessment[] = [
    {
      id: "a-1",
      framework: "PRISM",
      assessed_at: "2026-05-10T00:00:00Z",
      parsed_scores: [
        { dimension: "Innovating", score: 88 },
        { dimension: "Producing", score: 72 },
        { dimension: "Relating", score: 65 },
        { dimension: "Analyzing", score: 40 },
      ],
    },
  ];
  (listAssessments as jest.Mock).mockResolvedValueOnce({
    assessments,
    total: 1,
    limit: 100,
    offset: 0,
  });

  renderProfile();

  await waitFor(() => {
    expect(screen.getByText(/i run product\./i)).toBeInTheDocument();
  });
  await waitFor(() => {
    expect(screen.getByTestId("assessment-card-a-1")).toBeInTheDocument();
  });
  // Top-3 dimensions surface; lowest-score dim does not.
  expect(screen.getByText(/Innovating: 88/i)).toBeInTheDocument();
  expect(screen.getByText(/Producing: 72/i)).toBeInTheDocument();
  expect(screen.getByText(/Relating: 65/i)).toBeInTheDocument();
  expect(screen.queryByText(/Analyzing: 40/i)).not.toBeInTheDocument();
});

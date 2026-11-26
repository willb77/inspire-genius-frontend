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
import type { AssessmentHistoryItem, ProfileMe } from "@/types/profile/profile-types";

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
    items: [],
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

// F-W7-1b: the history route returns `items` (backend AssessmentListResponse),
// with no scores. The page read `assessments`, so this list was always empty
// and showed "No assessments yet" to everyone who had some.
const ROWS: AssessmentHistoryItem[] = [
  { id: "a-1", framework: "DISC", assessed_at: "2026-05-10T00:00:00Z", source: "user_input", is_authoritative: true },
  { id: "a-2", framework: "CLIFTON", assessed_at: "2026-05-12T00:00:00Z", source: "file_upload", is_authoritative: false, notes: "removed by owner 2026-11-25T23:40:00+00:00" },
];

function profileWithFact(): ProfileMe {
  return {
    user_id: "u-1",
    facts: [{ id: "f-1", category: "bio", key: "summary", value: "I run product." }],
    loaded_frameworks: ["DISC"],
  } as ProfileMe;
}

test("the history lists the backend's items as timeline cards", async () => {
  (getMyProfile as jest.Mock).mockResolvedValueOnce(profileWithFact());
  (listAssessments as jest.Mock).mockResolvedValueOnce({ items: ROWS, total: 2, limit: 100, offset: 0 });

  renderProfile();

  await waitFor(() => {
    expect(screen.getByText(/i run product\./i)).toBeInTheDocument();
  });
  expect(await screen.findByTestId("assessment-card-a-1")).toBeInTheDocument();
  expect(screen.queryByText(/no assessments yet/i)).not.toBeInTheDocument();
});

test("an entry the person removed is left out of the history", async () => {
  (getMyProfile as jest.Mock).mockResolvedValueOnce(profileWithFact());
  (listAssessments as jest.Mock).mockResolvedValueOnce({ items: ROWS, total: 2, limit: 100, offset: 0 });

  renderProfile();

  expect(await screen.findByTestId("assessment-card-a-1")).toBeInTheDocument();
  expect(screen.queryByTestId("assessment-card-a-2")).not.toBeInTheDocument();
});

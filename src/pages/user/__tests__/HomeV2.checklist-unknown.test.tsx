/**
 * HomeV2 must distinguish "no PRISM on file" from "the check failed".
 *
 * 2026-08-19: a user whose PRISM report WAS on file (prism_results row, four
 * doc_kind='prism' documents, endpoint returning 200 to his own sub) was shown
 * PRISM as an unticked checklist item with an "Add" button. `hasReport` is
 * `!prismError && !!file_name`, so a 500/network/CORS failure and a genuine
 * absence produced byte-identical UI — and the row invited him to re-upload a
 * report the platform already had.
 *
 * The distinction that matters and is easy to get wrong: a **404 is a real
 * answer** ("no PRISM CSV yet"). The hook deliberately does not retry it. If
 * 404 were treated as unknown, every genuinely-new user would carry a
 * permanent "couldn't check" warning, which is the same lie in the other
 * direction.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockLatestPrism = jest.fn();
const mockMyProfile = jest.fn();

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Derwood Spencer" } }),
}));
jest.mock("@/hooks/documents/useLatestPrism", () => ({
  useLatestPrism: () => mockLatestPrism(),
}));
jest.mock("@/verticals/core", () => ({
  useEnabledVerticals: () => ({ data: [] }),
  useVerticalAccess: () => ({ hasAccess: false, isLoading: false }),
}));
jest.mock("@/hooks/profile/useProfile", () => ({
  useLoadedFrameworks: () => ({ data: [] }),
  useMyProfile: () => mockMyProfile(),
  profileKeys: { me: () => ["profile", "me"] },
  usePreviewImportAssessment: () => ({ mutate: jest.fn(), reset: jest.fn(), isPending: false }),
  useConfirmImportAssessment: () => ({ mutate: jest.fn(), reset: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/agents/useAgentConversation", () => ({
  useAgentConversation: () => ({ data: undefined, isLoading: false }),
}));

import HomeV2 from "@/pages/user/HomeV2";

const PANEL = "homev2-personal-info-dropdown";

function prism({
  data = null,
  isError = false,
  status,
  refetch = jest.fn(),
}: {
  data?: unknown;
  isError?: boolean;
  status?: number;
  refetch?: jest.Mock;
} = {}) {
  return {
    data,
    isLoading: false,
    isError,
    error: status === undefined ? null : { response: { status } },
    refetch,
  };
}

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HomeV2 />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openPanel() {
  await userEvent.click(screen.getByTestId(PANEL));
  return screen.getByTestId(`${PANEL}-panel`);
}

beforeEach(() => {
  mockMyProfile.mockReturnValue({ data: { personal_docs: [] }, isError: false, refetch: jest.fn() });
  mockLatestPrism.mockReturnValue(prism());
});

describe("HomeV2 PRISM checklist — failed check is not an empty state", () => {
  it("a 500 renders PRISM as unknown, not as missing", async () => {
    mockLatestPrism.mockReturnValue(prism({ isError: true, status: 500 }));
    wrap();
    const panel = await openPanel();
    expect(within(panel).getByText(/couldn't check/i)).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: /^add prism/i }),
    ).not.toBeInTheDocument();
  });

  it("a network error with no response also renders as unknown", async () => {
    mockLatestPrism.mockReturnValue(prism({ isError: true }));
    wrap();
    const panel = await openPanel();
    expect(within(panel).getByText(/couldn't check/i)).toBeInTheDocument();
  });

  it("a 404 stays MISSING — it is a real answer, not a failure", async () => {
    mockLatestPrism.mockReturnValue(prism({ isError: true, status: 404 }));
    wrap();
    const panel = await openPanel();
    expect(within(panel).queryByText(/couldn't check/i)).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`${PANEL}-unknown-marker`),
    ).not.toBeInTheDocument();
  });

  it("a report on file still ticks even when /me fails", async () => {
    mockLatestPrism.mockReturnValue(prism({ data: { file_name: "prism.csv" } }));
    mockMyProfile.mockReturnValue({ data: undefined, isError: true, refetch: jest.fn() });
    wrap();
    const panel = await openPanel();
    // PRISM has two sources; one answering "yes" is enough to be certain.
    const prismRow = within(panel).getByText(/prism/i).closest("li");
    expect(prismRow).not.toBeNull();
    expect(within(prismRow as HTMLElement).queryByText(/couldn't check/i)).toBeNull();
  });

  it("refetches both queries when the user retries", async () => {
    const refetchPrism = jest.fn();
    const refetchProfile = jest.fn();
    mockLatestPrism.mockReturnValue(
      prism({ isError: true, status: 500, refetch: refetchPrism }),
    );
    mockMyProfile.mockReturnValue({
      data: { personal_docs: [] },
      isError: false,
      refetch: refetchProfile,
    });
    wrap();
    const panel = await openPanel();
    await userEvent.click(
      within(panel).getByRole("button", { name: /retry checking/i }),
    );
    expect(refetchPrism).toHaveBeenCalled();
    expect(refetchProfile).toHaveBeenCalled();
  });
});

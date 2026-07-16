import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the layout + data hooks so HomeV2 renders in isolation.
jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Will Brown", email: "willb77@3pp.com" } }),
}));
jest.mock("@/hooks/documents/useLatestPrism", () => ({
  useLatestPrism: () => ({ data: null, isLoading: false, isError: false }),
}));
jest.mock("@/hooks/audit/useAudit", () => ({
  useAuditStats: () => ({ data: null, isLoading: false }),
}));

// The regression: the backend returns a bare string[] of framework names.
// HomeV2 must NOT crash on `f.framework.toUpperCase()`.
jest.mock("@/hooks/profile/useProfile", () => ({
  useLoadedFrameworks: () => ({ data: ["PRISM", "DISC"] }),
  useMyProfile: () => ({ data: { personal_docs: ["resume"] } }),
  profileKeys: { me: () => ["profile", "me"] },
  usePreviewImportAssessment: () => ({ mutate: jest.fn(), reset: jest.fn(), isPending: false }),
  useConfirmImportAssessment: () => ({ mutate: jest.fn(), reset: jest.fn(), isPending: false }),
}));

import HomeV2 from "@/pages/user/HomeV2";

function wrap() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HomeV2 />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("HomeV2", () => {
  it("renders without crashing when loaded-frameworks is a string[]", () => {
    wrap();
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
  });

  it("marks a loaded framework (DISC) as done from the string list", () => {
    wrap();
    // Done items expose their Add button as disabled with '<name> added'.
    expect(
      screen.getByRole("button", { name: "DiSC added" }),
    ).toBeInTheDocument();
  });

  it("marks Resume done from profile personal_docs (and Bio not done)", () => {
    // Mock has personal_docs: ["resume"].
    wrap();
    expect(
      screen.getByRole("button", { name: "Resume added" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add Bio" }),
    ).toBeInTheDocument();
  });
});

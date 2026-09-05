/**
 * Goals Studio layout — the platform chrome around the goals pages.
 *
 * What is pinned here:
 *  - the surface is called Goals Studio, and the seven sections are pills
 *    under that heading (the standalone Summit sidebar is gone);
 *  - the chrome is the signed-in ROLE's own: a manager keeps the manager
 *    menu, a user and a super-admin get UserLayout (which already knows how
 *    to render a super-admin on a user page);
 *  - badges come from the live session, never from fixed numbers.
 */
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";

const mockUser: { role?: string } = { role: "user" };
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Will Brown", email: "will@example.com", ...mockUser } }),
}));

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="user-layout">{children}</div>,
}));
jest.mock("@/layouts/UnifiedLayout", () => ({
  __esModule: true,
  default: ({ role, children }: { role: string; children: ReactNode }) => (
    <div data-testid="unified-layout" data-role={role}>{children}</div>
  ),
}));

const mockSession: { goals: unknown[] } = { goals: [] };
let mockCategories: { status: string }[] = [];
jest.mock("@/hooks/summit/useGoalSession", () => ({
  useGoalSession: () => ({ data: mockSession }),
  useSummitCategories: () => mockCategories,
}));

import GoalsStudioLayout from "@/pages/summit/GoalsStudioLayout";

function renderAt(path = "/my/goals") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/my/goals" element={<GoalsStudioLayout />}>
          <Route index element={<div data-testid="page">index</div>} />
          <Route path="sharing" element={<div data-testid="page">sharing</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUser.role = "user";
  mockSession.goals = [];
  mockCategories = [];
});

describe("GoalsStudioLayout", () => {
  it("is called Goals Studio and lists the seven sections as pills, with the page beneath", () => {
    renderAt();
    expect(screen.getByRole("heading", { name: "Goals Studio" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Goals Studio sections" });
    expect(within(nav).getAllByRole("link").map((a) => a.textContent?.trim())).toEqual([
      "My Goals", "Interview", "Sharing", "Overview", "Discovery", "Coaches", "Coming soon",
    ]);
    expect(screen.getByTestId("page")).toHaveTextContent("index");
    // The standalone Summit chrome is gone: no wordmark, no "Back to Home".
    expect(screen.queryByText("Summit")).not.toBeInTheDocument();
    expect(screen.queryByText("Goal Setting")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Back to Home/ })).not.toBeInTheDocument();
  });

  it("uses the platform's user chrome for a user and for a super-admin", () => {
    renderAt();
    expect(screen.getByTestId("user-layout")).toBeInTheDocument();
    expect(screen.queryByTestId("unified-layout")).not.toBeInTheDocument();
  });

  it("keeps a manager inside the manager chrome", () => {
    mockUser.role = "manager";
    renderAt("/my/goals/sharing");
    const chrome = screen.getByTestId("unified-layout");
    expect(chrome).toHaveAttribute("data-role", "manager");
    expect(screen.queryByTestId("user-layout")).not.toBeInTheDocument();
    expect(screen.getByTestId("page")).toHaveTextContent("sharing");
  });

  it("badges come from the session, and only when earned", () => {
    renderAt();
    const nav = screen.getByRole("navigation", { name: "Goals Studio sections" });
    expect(within(nav).getByRole("link", { name: /My Goals/ })).toHaveTextContent(/^My Goals$/);

    mockSession.goals = [{}, {}];
    mockCategories = [{ status: "explored" }, { status: "todo" }, { status: "todo" }];
    renderAt();
    const navs = screen.getAllByRole("navigation", { name: "Goals Studio sections" });
    const fresh = navs[navs.length - 1];
    expect(within(fresh).getByRole("link", { name: /My Goals/ })).toHaveTextContent("2");
    expect(within(fresh).getByRole("link", { name: /Discovery/ })).toHaveTextContent("1/3");
  });
});

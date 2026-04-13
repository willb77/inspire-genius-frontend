/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/* ── Mocks ── */
const mockUseAuth = jest.fn();
jest.mock("@/context/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/types/roles", () => ({
  hasAccess: (role: string, path: string) => {
    const perms: Record<string, string[]> = {
      "super-admin": ["/super-admin", "/manager", "/home"],
      manager: ["/manager", "/home"],
      user: ["/home"],
    };
    const allowed = perms[role] ?? [];
    return allowed.some((p: string) => path.startsWith(p));
  },
  isUserRole: (v: string) =>
    ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"].includes(v),
}));

jest.mock("@/constants/routes", () => ({
  ROUTES: {
    LOGIN: "/login",
    ONBOARDING: { ONE: "/onboarding/one" },
  },
  PATHS: {
    SUPER_ADMIN_PREFIX: "/super-admin",
    MANAGER_PREFIX: "/manager",
    COMPANY_ADMIN_PREFIX: "/company-admin",
    PRACTITIONER_PREFIX: "/practitioner",
    DISTRIBUTOR_PREFIX: "/distributor",
  },
}));

jest.mock("@/constants/navigation", () => ({
  HOME_ROUTE_BY_ROLE: {
    user: "/home",
    manager: "/manager/dashboard",
    "super-admin": "/super-admin/dashboard",
  },
}));

jest.mock("@/lib/secureStorage", () => ({
  secureRemoveItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/components/loading-inspires-genius/LoadingCard", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-page">Loading...</div>,
}));

import ProtectedRoute from "../ProtectedRoute";

function renderWithRoute(initialPath: string, authValue: Record<string, unknown>) {
  mockUseAuth.mockReturnValue(authValue);

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<div data-testid="home-page">Home</div>} />
          <Route path="/manager/*" element={<div data-testid="manager-page">Manager</div>} />
          <Route path="/super-admin/*" element={<div data-testid="admin-page">Admin</div>} />
          <Route path="/onboarding/*" element={<div data-testid="onboarding-page">Onboarding</div>} />
        </Route>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows loading page initially (boot delay)", () => {
    renderWithRoute("/home", { user: { token: "tok", role: "user", isOnboardingCompleted: true } });
    expect(screen.getByTestId("loading-page")).toBeInTheDocument();
  });

  test("redirects to login when user has no token", async () => {
    renderWithRoute("/home", { user: null });
    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test("renders protected content when user is authenticated", async () => {
    renderWithRoute("/home", {
      user: { token: "tok", email: "a@b.com", role: "user", isOnboardingCompleted: true },
    });
    await waitFor(() => {
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test("redirects to onboarding when onboarding is not completed", async () => {
    renderWithRoute("/home", {
      user: { token: "tok", email: "a@b.com", role: "user", isOnboardingCompleted: false },
    });
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-page")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test("allows access to onboarding routes even if onboarding not completed", async () => {
    renderWithRoute("/onboarding/one", {
      user: { token: "tok", email: "a@b.com", role: "user", isOnboardingCompleted: false },
    });
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-page")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test("redirects user to their home when accessing unauthorized role route", async () => {
    renderWithRoute("/manager/dashboard", {
      user: { token: "tok", email: "a@b.com", role: "user", isOnboardingCompleted: true },
    });
    await waitFor(() => {
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test("allows super-admin to access manager route", async () => {
    renderWithRoute("/manager/dashboard", {
      user: { token: "tok", email: "a@b.com", role: "super-admin", isOnboardingCompleted: true },
    });
    await waitFor(() => {
      expect(screen.getByTestId("manager-page")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test("allows manager to access their own routes", async () => {
    renderWithRoute("/manager/dashboard", {
      user: { token: "tok", email: "a@b.com", role: "manager", isOnboardingCompleted: true },
    });
    await waitFor(() => {
      expect(screen.getByTestId("manager-page")).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});

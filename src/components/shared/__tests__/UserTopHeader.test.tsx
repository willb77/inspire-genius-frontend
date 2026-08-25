/**
 * @jest-environment jsdom
 */

/* ---- Module mocks (before imports) ----
   NotificationBell and LanguageSwitcher are stubbed for the same reason the
   super-admin page tests stub their layouts: NotificationBell reaches the real
   `@/lib/axios`, whose module-level `attachInterceptors` runs on import. */

const mockNavigate = jest.fn();
let mockPathname = "/home";
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}));

let mockUser: Record<string, unknown> | null = {
  id: "u1",
  role: "user",
  email: "will@example.com",
  fullName: "Will Brown",
};
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ logout: jest.fn(), user: mockUser }),
}));
jest.mock("@/components/layout/NotificationBell", () => ({
  __esModule: true,
  default: () => <div data-testid="bell" />,
}));
jest.mock("@/components/LanguageSwitcher", () => ({
  __esModule: true,
  default: () => <div data-testid="lang" />,
}));
jest.mock("@/components/shared/ConfirmDialog", () => ({
  __esModule: true,
  default: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

/* ---- Imports (after mocks) ---- */
import { render, screen } from "@testing-library/react";
import UserTopHeader from "@/components/shared/UserTopHeader";

const GUIDE_URL =
  "https://ig-demo-public-videos.s3.amazonaws.com/My_Workspace_userguide.mp4";

beforeEach(() => {
  mockPathname = "/home";
  mockUser = {
    id: "u1",
    role: "user",
    email: "will@example.com",
    fullName: "Will Brown",
  };
});

describe("UserTopHeader — My Workspace guide pill", () => {
  it("sits beside the greeting, not below it", () => {
    render(<UserTopHeader />);
    const pill = screen.getByTestId("workspace-guide-video");
    const greeting = screen.getByText(/Welcome! Will Brown/);
    // The pill must share a row with the greeting COLUMN — i.e. its parent is
    // the column's parent, not the column itself. That is what puts it to the
    // right of both greeting lines rather than under them.
    expect(pill.parentElement).toBe(greeting.parentElement?.parentElement);
    expect(pill.parentElement).toContainElement(
      screen.getByText(/Your AI coaches are ready/),
    );
  });

  it("points at the durable public URL and opens safely in a new tab", () => {
    render(<UserTopHeader />);
    const pill = screen.getByTestId("workspace-guide-video");
    // A durable S3 object URL. A presigned link would expire and leave a dead
    // pill in the header of every page, which is the failure this guards.
    expect(pill).toHaveAttribute("href", GUIDE_URL);
    expect(pill).toHaveAttribute("target", "_blank");
    // Both tokens matter: noopener stops the opened tab reaching
    // window.opener, and it is why this is an anchor rather than
    // window.open(..., "noopener"), which returns null and navigates the
    // CURRENT tab in some browsers.
    expect(pill.getAttribute("rel")).toContain("noopener");
    expect(pill.getAttribute("rel")).toContain("noreferrer");
  });

  it.each([
    "/home",
    "/dashboard",
    "/coaches",
    "/documents",
    "/settings",
    "/help",
  ])("shows on the user surface %s", (path) => {
    mockPathname = path;
    render(<UserTopHeader />);
    expect(screen.getByTestId("workspace-guide-video")).toBeInTheDocument();
  });

  it.each([
    "/super-admin/dashboard",
    "/manager/team",
    "/company-admin/users",
    "/practitioner/clients",
    "/distributor/credits",
  ])("stays out of the role console %s", (path) => {
    // This header renders for all six roles on every page, so an ungated pill
    // would put a user-orientation film on the admin consoles too.
    mockPathname = path;
    render(<UserTopHeader />);
    expect(
      screen.queryByTestId("workspace-guide-video"),
    ).not.toBeInTheDocument();
  });

  it("renders for a super-admin browsing the user surface", () => {
    // The person who asked for this pill is a super-admin sitting on /home.
    mockPathname = "/home";
    mockUser = { id: "u1", role: "super-admin", email: "root@example.com" };
    render(<UserTopHeader />);
    expect(screen.getByTestId("workspace-guide-video")).toBeInTheDocument();
  });

  it("renders with no user loaded", () => {
    // The pill is universal — it explains the product to someone who has
    // nothing yet, which is precisely the person who needs it.
    mockUser = null;
    render(<UserTopHeader />);
    expect(screen.getByTestId("workspace-guide-video")).toBeInTheDocument();
    expect(screen.getByText(/Welcome! User/)).toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import NetworkHub from "../NetworkHub";

jest.mock("@/layouts/DistributorLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="distributor-layout">{children}</div>,
}));
jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`data-card-${title}`}>{children}</div>
  ),
}));
jest.mock("@/components/dashboard/StatusBadge", () => ({
  __esModule: true,
  default: ({ label, status }: { label?: string; status?: string }) => (
    <span data-testid="status-badge">{label ?? status}</span>
  ),
}));
jest.mock("@/components/dashboard/ProgressBar", () => ({
  __esModule: true,
  default: ({ value }: { value: number }) => <div data-testid="progress-bar">{value}%</div>,
}));
jest.mock("@/components/dashboard/PlaceholderBanner", () => ({
  __esModule: true,
  default: () => <div data-testid="placeholder-banner" />,
}));
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

const hookDefaults = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };
jest.mock("@/hooks/distributor/useDistributor", () => ({
  useDistributorPractitioners: () => hookDefaults,
  useDistributorTerritory: () => hookDefaults,
}));

function renderWithRouter(initialEntry: string, defaultTab?: "practitioners" | "territory") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <NetworkHub defaultTab={defaultTab} />
    </MemoryRouter>
  );
}

describe("NetworkHub", () => {
  it("renders the page heading and both tab triggers", () => {
    renderWithRouter("/distributor/network");
    expect(screen.getByRole("heading", { name: "Network" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Practitioners" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Territory" })).toBeInTheDocument();
  });

  it("mounts the practitioners body by default", () => {
    renderWithRouter("/distributor/network");
    expect(screen.getByTestId("practitioners-body")).toBeInTheDocument();
  });

  it("mounts the territory body when defaultTab='territory'", () => {
    renderWithRouter("/distributor/network", "territory");
    expect(screen.getByTestId("territory-body")).toBeInTheDocument();
  });

  it("respects ?tab=territory query param over defaultTab", () => {
    renderWithRouter("/distributor/network?tab=territory");
    expect(screen.getByTestId("territory-body")).toBeInTheDocument();
  });

  it("respects ?tab=practitioners query param", () => {
    renderWithRouter("/distributor/network?tab=practitioners", "territory");
    expect(screen.getByTestId("practitioners-body")).toBeInTheDocument();
  });

  it("switches body when user clicks the Territory tab", async () => {
    const user = userEvent.setup();
    renderWithRouter("/distributor/network");
    expect(screen.getByTestId("practitioners-body")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Territory" }));
    expect(await screen.findByTestId("territory-body")).toBeInTheDocument();
  });

  it("switches body when user clicks the Practitioners tab", async () => {
    const user = userEvent.setup();
    renderWithRouter("/distributor/network", "territory");
    expect(screen.getByTestId("territory-body")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Practitioners" }));
    expect(await screen.findByTestId("practitioners-body")).toBeInTheDocument();
  });

  it("falls back to defaultTab when query value is invalid", () => {
    renderWithRouter("/distributor/network?tab=bogus", "practitioners");
    expect(screen.getByTestId("practitioners-body")).toBeInTheDocument();
  });
});

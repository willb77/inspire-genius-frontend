/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DistributorTerritory from "../Territory";

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

describe("DistributorTerritory (NetworkHub wrapper)", () => {
  it("renders NetworkHub with territory tab active", () => {
    render(
      <MemoryRouter>
        <DistributorTerritory />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Network" })).toBeInTheDocument();
    expect(screen.getByTestId("territory-body")).toBeInTheDocument();
  });
});

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
    expect(screen.getByRole("heading", { level: 1, name: "My practitioners" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Regions" })).toHaveAttribute("aria-selected", "true");
  });
});

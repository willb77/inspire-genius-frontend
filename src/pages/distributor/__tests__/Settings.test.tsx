/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import DistributorSettings from "../Settings";

jest.mock("@/layouts/DistributorLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="distributor-layout">{children}</div>,
}));
jest.mock("@/components/shared/settings/Settings", () => ({
  __esModule: true,
  default: () => <div data-testid="settings-component">Settings Content</div>,
}));

describe("DistributorSettings", () => {
  it("renders inside DistributorLayout", () => {
    render(<DistributorSettings />);
    expect(screen.getByTestId("distributor-layout")).toBeInTheDocument();
  });

  it("renders the shared Settings component", () => {
    render(<DistributorSettings />);
    expect(screen.getByTestId("settings-component")).toBeInTheDocument();
    expect(screen.getByText("Settings Content")).toBeInTheDocument();
  });
});

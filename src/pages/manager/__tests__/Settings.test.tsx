/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ManagerSettings from "../Settings";

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
  ),
}));

jest.mock("@/components/shared/settings/Settings", () => ({
  __esModule: true,
  default: () => <div data-testid="settings-component">Settings Content</div>,
}));

describe("ManagerSettings", () => {
  it("renders within ManagerLayout", () => {
    render(<ManagerSettings />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders the shared Settings component", () => {
    render(<ManagerSettings />);
    expect(screen.getByTestId("settings-component")).toBeInTheDocument();
    expect(screen.getByText("Settings Content")).toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import PractitionerSettings from "../Settings";

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}));
jest.mock("@/components/shared/settings/Settings", () => ({
  __esModule: true,
  default: () => <div data-testid="settings-component">Settings Content</div>,
}));

describe("PractitionerSettings", () => {
  it("renders inside PractitionerLayout", () => {
    render(<PractitionerSettings />);
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument();
  });

  it("renders the shared Settings component", () => {
    render(<PractitionerSettings />);
    expect(screen.getByTestId("settings-component")).toBeInTheDocument();
    expect(screen.getByText("Settings Content")).toBeInTheDocument();
  });
});

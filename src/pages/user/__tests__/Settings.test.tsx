/**
 * @jest-environment jsdom
 */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

import { render, screen } from "@testing-library/react";
import UserSettingsPage from "../Settings";

/* ---- Mocks ---- */

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

jest.mock("@/components/shared/settings/Settings", () => ({
  __esModule: true,
  default: () => <div data-testid="settings-component">Settings Content</div>,
}));

/* ---- Tests ---- */

describe("UserSettingsPage", () => {
  it("renders inside UserLayout", () => {
    render(<UserSettingsPage />);
    expect(screen.getByTestId("user-layout")).toBeInTheDocument();
  });

  it("renders shared Settings component", () => {
    render(<UserSettingsPage />);
    expect(screen.getByTestId("settings-component")).toBeInTheDocument();
    expect(screen.getByText("Settings Content")).toBeInTheDocument();
  });
});

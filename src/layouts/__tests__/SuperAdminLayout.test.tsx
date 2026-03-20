/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import SuperAdminLayout from "../SuperAdminLayout";

// Mock AppShell since SuperAdminLayout is now a thin wrapper
const mockAppShell = jest.fn();

jest.mock("../AppShell", () => ({
  __esModule: true,
  default: (props: any) => {
    mockAppShell(props);
    return (
      <div data-testid="app-shell" data-role={props.role} data-class={props.className}>
        {props.children}
      </div>
    );
  },
}));

describe("SuperAdminLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders children correctly", () => {
    render(
      <SuperAdminLayout>
        <div data-testid="child">Test Content</div>
      </SuperAdminLayout>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  test("passes role='super-admin' to AppShell", () => {
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );

    expect(mockAppShell).toHaveBeenCalled();
    const props = mockAppShell.mock.calls[0][0];
    expect(props.role).toBe("super-admin");
  });

  test("forwards className to AppShell", () => {
    render(
      <SuperAdminLayout className="custom-class">
        <div />
      </SuperAdminLayout>,
    );

    expect(screen.getByTestId("app-shell")).toHaveAttribute(
      "data-class",
      "custom-class",
    );
  });
});

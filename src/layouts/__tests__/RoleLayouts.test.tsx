/**
 * @jest-environment jsdom
 *
 * Tests for role-specific layout wrappers:
 * - ManagerLayout
 * - CompanyAdminLayout
 * - PractitionerLayout
 * - DistributorLayout
 *
 * Each is a thin wrapper around AppShell with a hardcoded role prop.
 */

import { render, screen } from "@testing-library/react";

/* ── Mock AppShell ── */
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

import ManagerLayout from "../ManagerLayout";
import CompanyAdminLayout from "../CompanyAdminLayout";
import PractitionerLayout from "../PractitionerLayout";
import DistributorLayout from "../DistributorLayout";

describe("ManagerLayout", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders children", () => {
    render(<ManagerLayout><div data-testid="child">Hello</div></ManagerLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  test("passes role='manager' to AppShell", () => {
    render(<ManagerLayout><div /></ManagerLayout>);
    expect(mockAppShell).toHaveBeenCalledWith(expect.objectContaining({ role: "manager" }));
  });

  test("forwards className", () => {
    render(<ManagerLayout className="test-class"><div /></ManagerLayout>);
    expect(mockAppShell).toHaveBeenCalledWith(expect.objectContaining({ className: "test-class" }));
  });
});

describe("CompanyAdminLayout", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders children", () => {
    render(<CompanyAdminLayout><div data-testid="child">Hello</div></CompanyAdminLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  test("passes role='company-admin' to AppShell", () => {
    render(<CompanyAdminLayout><div /></CompanyAdminLayout>);
    expect(mockAppShell).toHaveBeenCalledWith(expect.objectContaining({ role: "company-admin" }));
  });

  test("forwards className", () => {
    render(<CompanyAdminLayout className="ca-class"><div /></CompanyAdminLayout>);
    expect(mockAppShell).toHaveBeenCalledWith(expect.objectContaining({ className: "ca-class" }));
  });
});

describe("PractitionerLayout", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders children", () => {
    render(<PractitionerLayout><div data-testid="child">Hello</div></PractitionerLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  test("passes role='practitioner' to AppShell", () => {
    render(<PractitionerLayout><div /></PractitionerLayout>);
    expect(mockAppShell).toHaveBeenCalledWith(expect.objectContaining({ role: "practitioner" }));
  });

  test("forwards className", () => {
    render(<PractitionerLayout className="p-class"><div /></PractitionerLayout>);
    expect(mockAppShell).toHaveBeenCalledWith(expect.objectContaining({ className: "p-class" }));
  });
});

describe("DistributorLayout", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders children", () => {
    render(<DistributorLayout><div data-testid="child">Hello</div></DistributorLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  test("passes role='distributor' to AppShell", () => {
    render(<DistributorLayout><div /></DistributorLayout>);
    expect(mockAppShell).toHaveBeenCalledWith(expect.objectContaining({ role: "distributor" }));
  });

  test("forwards className", () => {
    render(<DistributorLayout className="d-class"><div /></DistributorLayout>);
    expect(mockAppShell).toHaveBeenCalledWith(expect.objectContaining({ className: "d-class" }));
  });
});

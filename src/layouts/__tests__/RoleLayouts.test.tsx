/**
 * @jest-environment jsdom
 *
 * Tests for role-specific layout wrappers. As of Phase 1 (2026-07-22) all four
 * non-standard roles share the standard SidebarScaffold chrome via UnifiedLayout:
 * - ManagerLayout        → UnifiedLayout
 * - CompanyAdminLayout   → UnifiedLayout
 * - PractitionerLayout   → UnifiedLayout
 * - DistributorLayout    → UnifiedLayout
 *
 * Each is a thin wrapper around UnifiedLayout with a hardcoded role prop.
 * (AppShell is still mocked below only so any lingering import resolves; it is
 * no longer the target of these wrappers and is retired pending Phase 6 deletion.)
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

/* ── Mock UnifiedLayout (PractitionerLayout migrated onto it in Phase 1) ── */
const mockUnifiedLayout = jest.fn();
jest.mock("../UnifiedLayout", () => ({
  __esModule: true,
  default: (props: any) => {
    mockUnifiedLayout(props);
    return (
      <div data-testid="unified-layout" data-role={props.role} data-class={props.className}>
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

  test("passes role='manager' to UnifiedLayout", () => {
    render(<ManagerLayout><div /></ManagerLayout>);
    expect(mockUnifiedLayout).toHaveBeenCalledWith(expect.objectContaining({ role: "manager" }));
  });

  test("forwards className", () => {
    render(<ManagerLayout className="test-class"><div /></ManagerLayout>);
    expect(mockUnifiedLayout).toHaveBeenCalledWith(expect.objectContaining({ className: "test-class" }));
  });
});

describe("CompanyAdminLayout", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders children", () => {
    render(<CompanyAdminLayout><div data-testid="child">Hello</div></CompanyAdminLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  test("passes role='company-admin' to UnifiedLayout", () => {
    render(<CompanyAdminLayout><div /></CompanyAdminLayout>);
    expect(mockUnifiedLayout).toHaveBeenCalledWith(expect.objectContaining({ role: "company-admin" }));
  });

  test("forwards className", () => {
    render(<CompanyAdminLayout className="ca-class"><div /></CompanyAdminLayout>);
    expect(mockUnifiedLayout).toHaveBeenCalledWith(expect.objectContaining({ className: "ca-class" }));
  });
});

describe("PractitionerLayout", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders children", () => {
    render(<PractitionerLayout><div data-testid="child">Hello</div></PractitionerLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  test("passes role='practitioner' to UnifiedLayout", () => {
    render(<PractitionerLayout><div /></PractitionerLayout>);
    expect(mockUnifiedLayout).toHaveBeenCalledWith(expect.objectContaining({ role: "practitioner" }));
  });

  test("forwards className", () => {
    render(<PractitionerLayout className="p-class"><div /></PractitionerLayout>);
    expect(mockUnifiedLayout).toHaveBeenCalledWith(expect.objectContaining({ className: "p-class" }));
  });
});

describe("DistributorLayout", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders children", () => {
    render(<DistributorLayout><div data-testid="child">Hello</div></DistributorLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  test("passes role='distributor' to UnifiedLayout", () => {
    render(<DistributorLayout><div /></DistributorLayout>);
    expect(mockUnifiedLayout).toHaveBeenCalledWith(expect.objectContaining({ role: "distributor" }));
  });

  test("forwards className", () => {
    render(<DistributorLayout className="d-class"><div /></DistributorLayout>);
    expect(mockUnifiedLayout).toHaveBeenCalledWith(expect.objectContaining({ className: "d-class" }));
  });
});

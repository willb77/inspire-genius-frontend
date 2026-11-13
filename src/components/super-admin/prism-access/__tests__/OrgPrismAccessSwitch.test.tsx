import { fireEvent, render, screen } from "@testing-library/react";
import OrgPrismAccessSwitch from "../OrgPrismAccessSwitch";

const mutate = jest.fn();
let perms = { canManagePrismAccess: false, isOwner: false };
let query: Record<string, unknown> = {};
const orgQueryEnabled = jest.fn();

jest.mock("@/hooks/super-admin/prism-access/usePrismAccessAdmin", () => ({
  usePrismAccessPermissions: () => perms,
  useOrgPrismAccess: (_id: string, enabled: boolean) => {
    orgQueryEnabled(enabled);
    return query;
  },
  useSetOrgPrismAccess: () => ({ mutate, isPending: false }),
  prismAccessErrorMessage: (_e: unknown, f: string) => f,
}));

describe("OrgPrismAccessSwitch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    perms = { canManagePrismAccess: false, isOwner: false };
    query = {};
  });

  it("renders nothing, and reads nothing, for a non-approver", () => {
    const { container } = render(<OrgPrismAccessSwitch orgId="o1" />);
    expect(container).toBeEmptyDOMElement();
    expect(orgQueryEnabled).toHaveBeenCalledWith(false);
  });

  it("lists the organisation when switched on", () => {
    perms = { canManagePrismAccess: true, isOwner: false };
    query = { data: { listed: false, tier: false } };
    render(<OrgPrismAccessSwitch orgId="o1" />);
    const sw = screen.getByRole("switch", { name: "Members may request PRISM surveys" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    fireEvent.click(sw);
    expect(mutate).toHaveBeenCalledWith({ orgId: "o1", listed: true });
  });

  it("unlists when switched off, and notes a tier-wide switch", () => {
    perms = { canManagePrismAccess: true, isOwner: false };
    query = { data: { listed: true, tier: true } };
    render(<OrgPrismAccessSwitch orgId="o1" />);
    expect(screen.getByText(/whole environment is switched on/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch"));
    expect(mutate).toHaveBeenCalledWith({ orgId: "o1", listed: false });
  });

  it("shows a failed read and disables the switch", () => {
    perms = { canManagePrismAccess: true, isOwner: false };
    query = { isError: true, error: new Error("x") };
    render(<OrgPrismAccessSwitch orgId="o1" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});

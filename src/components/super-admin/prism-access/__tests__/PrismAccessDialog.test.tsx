import { fireEvent, render, screen } from "@testing-library/react";
import PrismAccessDialog from "../PrismAccessDialog";
import type { UserPrismAccess } from "@/types/super-admin/prism-access";

const grant = jest.fn();
const revoke = jest.fn();
let query: Record<string, unknown> = {};

jest.mock("@/hooks/super-admin/prism-access/usePrismAccessAdmin", () => ({
  useUserPrismAccess: () => query,
  useGrantUserPrismAccess: () => ({ mutate: grant, isPending: false }),
  useRevokeUserPrismAccess: () => ({ mutate: revoke, isPending: false }),
  prismAccessErrorMessage: (_e: unknown, f: string) => f,
}));

function view(coverage: Partial<UserPrismAccess["coverage"]>, extra: Partial<UserPrismAccess> = {}) {
  return {
    user: { user_id: "u1", name: "Pat Person", email: "pat@example.com", org_id: "o1" },
    coverage: { tier: false, org: false, person: false, effective_scope: null, allowed: false, ...coverage },
    open_request: null,
    requests: [],
    history: [],
    ...extra,
  } as UserPrismAccess;
}

const target = { id: "u1", email: "pat@example.com", name: "Pat Person" };
const renderIt = () =>
  render(<PrismAccessDialog open onOpenChange={jest.fn()} target={target} />);

describe("PrismAccessDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows loading, then an error with a retry", () => {
    query = { isLoading: true };
    const { rerender } = renderIt();
    expect(screen.getByText(/Loading access/)).toBeInTheDocument();
    const refetch = jest.fn();
    query = { isError: true, error: new Error("x"), refetch };
    rerender(<PrismAccessDialog open onOpenChange={jest.fn()} target={target} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load their PRISM access.");
    fireEvent.click(screen.getByText("Try again"));
    expect(refetch).toHaveBeenCalled();
  });

  it("a blocked person can be granted; there is nothing to revoke", () => {
    query = { data: view({}) };
    renderIt();
    expect(screen.getByTestId("prism-access-summary")).toHaveTextContent(/Blocked/);
    expect(screen.queryByTestId("prism-access-revoke")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("prism-access-grant"));
    expect(grant).toHaveBeenCalledWith({ userId: "u1" });
  });

  it("an approved person is revoked only after a confirm, keeping history", () => {
    query = {
      data: view(
        { person: true, effective_scope: "person", allowed: true },
        { history: [{ id: "e1", action: "user_grant", actor_email: "a@example.com", at: "2026-11-12T00:00:00Z", detail: {} }] },
      ),
    };
    renderIt();
    expect(screen.queryByTestId("prism-access-grant")).not.toBeInTheDocument();
    expect(screen.getByText(/granted by a@example.com/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("prism-access-revoke"));
    expect(revoke).not.toHaveBeenCalled();
    expect(screen.getByText(/Their history is kept/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("prism-access-revoke-confirm"));
    expect(revoke).toHaveBeenCalledWith({ userId: "u1" }, expect.anything());
  });

  it("says when their organisation already covers them", () => {
    query = { data: view({ org: true, effective_scope: "org", allowed: true }) };
    renderIt();
    expect(screen.getByTestId("prism-access-summary")).toHaveTextContent(/organisation/);
    expect(screen.getByTestId("prism-access-covered")).toHaveTextContent(
      /organisation already covers them/,
    );
  });

  it("an open request can be approved by granting or denied", () => {
    query = {
      data: view({}, {
        open_request: { id: "r1", status: "requested", practitioner_name: "Prac", requested_at: null, decided_at: null },
      }),
    };
    renderIt();
    expect(screen.getByText(/Granting approves it/)).toBeInTheDocument();
    expect(screen.getByTestId("prism-access-revoke")).toHaveTextContent("Deny open request");
  });
});

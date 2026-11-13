import { fireEvent, render, screen, within } from "@testing-library/react";
import VerticalEntitlementsDialog from "../VerticalEntitlementsDialog";
import type { UserEntitlements } from "@/types/super-admin/vertical-entitlements";

const grant = jest.fn();
const revoke = jest.fn();
let query: Record<string, unknown> = {};

jest.mock("@/hooks/super-admin/vertical-entitlements/useVerticalEntitlementsAdmin", () => ({
  useUserEntitlements: () => query,
  useGrantVertical: () => ({ mutate: grant, isPending: false }),
  useRevokeVertical: () => ({ mutate: revoke, isPending: false }),
  entitlementsErrorMessage: (_e: unknown, f: string) => f,
}));
jest.mock("@/verticals/core", () => ({
  getVertical: (key: string) =>
    ({ lumen: { title: "Lumen" }, grant: { title: "GRANT" } } as Record<string, { title: string }>)[key],
}));

function view(extra: Partial<UserEntitlements> = {}): UserEntitlements {
  return {
    user_id: "u1",
    email: "pat@example.com",
    catalogue: ["grant", "job-fit", "lumen"],
    effective: ["lumen"],
    rows: [{ matched_on: "account", verticals: ["lumen"], updated_at: null }],
    row_count: 1,
    conflict: false,
    unmanaged_count: 0,
    history: [],
    ...extra,
  };
}

const target = { id: "u1", email: "pat@example.com", name: "Pat Person" };
const renderIt = () =>
  render(<VerticalEntitlementsDialog open onOpenChange={jest.fn()} target={target} />);

const row = (title: string) => screen.getByText(title).closest("li") as HTMLElement;

describe("VerticalEntitlementsDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows loading, then an error with a retry", () => {
    query = { isLoading: true };
    const { rerender } = renderIt();
    expect(screen.getByText(/Loading entitlements/)).toBeInTheDocument();
    const refetch = jest.fn();
    query = { isError: true, error: new Error("x"), refetch };
    rerender(<VerticalEntitlementsDialog open onOpenChange={jest.fn()} target={target} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load their entitlements.");
    fireEvent.click(screen.getByText("Try again"));
    expect(refetch).toHaveBeenCalled();
  });

  it("lists exactly the backend's catalogue, by title, with on/off from the effective list", () => {
    query = { data: view() };
    renderIt();
    const items = within(screen.getByTestId("entitlements-list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(row("Lumen")).getByText("On")).toBeInTheDocument();
    expect(within(row("GRANT")).getByText("Off")).toBeInTheDocument();
    // An unregistered key falls back to the key itself.
    expect(within(row("job-fit")).getByText("Off")).toBeInTheDocument();
  });

  it("grants one vertical with one click", () => {
    query = { data: view() };
    renderIt();
    expect(screen.queryByTestId("entitlement-revoke-grant")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("entitlement-grant-grant"));
    expect(grant).toHaveBeenCalledWith({ userId: "u1", vertical: "grant", title: "GRANT" });
  });

  it("revokes only after a confirm that names the person and the vertical", () => {
    query = { data: view() };
    renderIt();
    expect(screen.queryByTestId("entitlement-grant-lumen")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("entitlement-revoke-lumen"));
    expect(revoke).not.toHaveBeenCalled();
    expect(screen.getByText("Revoke Lumen from Pat Person?")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("entitlement-revoke-confirm-lumen"));
    expect(revoke).toHaveBeenCalledWith(
      { userId: "u1", vertical: "lumen", title: "Lumen" },
      expect.anything(),
    );
  });

  it("cancel backs out of a revoke without calling it", () => {
    query = { data: view() };
    renderIt();
    fireEvent.click(screen.getByTestId("entitlement-revoke-lumen"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(revoke).not.toHaveBeenCalled();
    expect(screen.getByTestId("entitlement-revoke-lumen")).toBeInTheDocument();
  });

  it("with disagreeing records it warns, and offers both grant and revoke for the split vertical", () => {
    query = {
      data: view({
        row_count: 2,
        conflict: true,
        rows: [
          { matched_on: "account", verticals: ["lumen"], updated_at: null },
          { matched_on: "email", verticals: [], updated_at: null },
        ],
      }),
    };
    renderIt();
    expect(screen.getByTestId("entitlements-conflict")).toHaveTextContent(/2 entitlement records/);
    expect(screen.getByTestId("entitlement-grant-lumen")).toBeInTheDocument();
    expect(screen.getByTestId("entitlement-revoke-lumen")).toBeInTheDocument();
  });

  it("counts entitlements managed elsewhere without naming them", () => {
    query = { data: view({ unmanaged_count: 1 }) };
    renderIt();
    expect(screen.getByTestId("entitlements-unmanaged")).toHaveTextContent(
      "They also hold 1 entitlement managed elsewhere. This screen never changes it.",
    );
    expect(screen.queryByText(/honor/i)).not.toBeInTheDocument();
  });

  it("shows the history with the vertical's title", () => {
    query = {
      data: view({
        history: [
          { id: "e1", action: "revoke", actor_email: "a@example.com", at: "2026-11-13T00:00:00Z", detail: { vertical: "grant" } },
        ],
      }),
    };
    renderIt();
    expect(screen.getByText(/GRANT revoked by a@example.com/)).toBeInTheDocument();
  });
});

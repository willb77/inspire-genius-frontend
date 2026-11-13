import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PrismApproversPanel from "../PrismApproversPanel";

const add = jest.fn();
const remove = jest.fn();
let perms = { canManagePrismAccess: true, isOwner: false };
let list: Record<string, unknown> = {};
const listEnabled = jest.fn();

jest.mock("@/hooks/super-admin/prism-access/usePrismAccessAdmin", () => ({
  usePrismAccessPermissions: () => perms,
  useApprovers: (enabled: boolean) => {
    listEnabled(enabled);
    return list;
  },
  useAddApprover: () => ({ mutate: add, isPending: false }),
  useRemoveApprover: () => ({ mutate: remove, isPending: false }),
  prismAccessErrorMessage: (_e: unknown, f: string) => f,
}));

describe("PrismApproversPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    perms = { canManagePrismAccess: true, isOwner: false };
    list = {};
  });

  it("renders nothing, and lists nothing, for anyone but the owner", () => {
    const { container } = render(<PrismApproversPanel />);
    expect(container).toBeEmptyDOMElement();
    expect(listEnabled).toHaveBeenCalledWith(false);
  });

  it("lists approvers; the owner's own row cannot be removed", () => {
    perms = { canManagePrismAccess: true, isOwner: true };
    list = {
      data: {
        approvers: [
          { id: "o", capability: "prism_survey_access", user_id: null, email: "owner@example.com", added_at: null, is_owner: true },
          { id: "a1", capability: "prism_survey_access", user_id: "u", email: "peer@example.com", added_at: null },
        ],
      },
    };
    render(<PrismApproversPanel />);
    expect(screen.getByText("(you, always)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Remove owner@example.com")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Remove peer@example.com"));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Confirm remove"));
    expect(remove).toHaveBeenCalledWith({ id: "a1" }, expect.anything());
  });

  it("says when there is nobody besides the owner, and shows a failed read", () => {
    perms = { canManagePrismAccess: true, isOwner: true };
    list = { data: { approvers: [] } };
    const { rerender } = render(<PrismApproversPanel />);
    expect(screen.getByText("No approvers besides you.")).toBeInTheDocument();
    list = { isError: true, error: new Error("x") };
    rerender(<PrismApproversPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the approvers.");
  });

  it("validates the email, then adds it lower-cased for the PRISM capability", async () => {
    perms = { canManagePrismAccess: true, isOwner: true };
    list = { data: { approvers: [] } };
    render(<PrismApproversPanel />);
    await act(async () => {
      fireEvent.click(screen.getByText("Add approver"));
    });
    expect(await screen.findByText("Enter their email address.")).toBeInTheDocument();
    expect(add).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: " Peer@Example.com " } });
    await act(async () => {
      fireEvent.click(screen.getByText("Add approver"));
    });
    await waitFor(() =>
      expect(add).toHaveBeenCalledWith(
        { email: "peer@example.com", capability: "prism_survey_access" },
        expect.anything(),
      ),
    );
  });

  it("for vertical entitlements: lists only that control's approvers and adds for it", async () => {
    perms = { canManagePrismAccess: true, isOwner: true };
    list = {
      data: {
        approvers: [
          { id: "p1", capability: "prism_survey_access", user_id: "u", email: "prism.peer@example.com", added_at: null },
          { id: "v1", capability: "vertical_entitlements", user_id: "u", email: "ve.peer@example.com", added_at: null },
        ],
      },
    };
    render(<PrismApproversPanel capability="vertical_entitlements" />);
    expect(screen.getByText(/grant or revoke vertical entitlements/)).toBeInTheDocument();
    expect(screen.getByText("ve.peer@example.com")).toBeInTheDocument();
    expect(screen.getByText("Vertical entitlements")).toBeInTheDocument();
    expect(screen.queryByText("prism.peer@example.com")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "New@Example.com" } });
    await act(async () => {
      fireEvent.click(screen.getByText("Add approver"));
    });
    await waitFor(() =>
      expect(add).toHaveBeenCalledWith(
        { email: "new@example.com", capability: "vertical_entitlements" },
        expect.anything(),
      ),
    );
  });

  it("by default lists only PRISM approvers", () => {
    perms = { canManagePrismAccess: true, isOwner: true };
    list = {
      data: {
        approvers: [
          { id: "p1", capability: "prism_survey_access", user_id: "u", email: "prism.peer@example.com", added_at: null },
          { id: "v1", capability: "vertical_entitlements", user_id: "u", email: "ve.peer@example.com", added_at: null },
        ],
      },
    };
    render(<PrismApproversPanel />);
    expect(screen.getByText("prism.peer@example.com")).toBeInTheDocument();
    expect(screen.queryByText("ve.peer@example.com")).not.toBeInTheDocument();
  });
});

import { act, fireEvent, render, screen } from "@testing-library/react";
import CreateOrganizationDialog from "../CreateOrganizationDialog";

type Opts = {
  onSuccess?: (org: { name: string }) => void;
  onError?: (err: { message: string; response?: { data?: { detail?: string } } }) => void;
};

const mockMutate = jest.fn();
let capturedOpts: Opts = {};
jest.mock("@/hooks/super-admin/organization-management/useOrganizationManagement", () => ({
  useCreateOrg: (opts: Opts) => {
    capturedOpts = opts;
    return { mutate: mockMutate, isPending: false };
  },
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  capturedOpts = {};
});

function renderDialog(extra: Partial<React.ComponentProps<typeof CreateOrganizationDialog>> = {}) {
  const onOpenChange = jest.fn();
  const onCreated = jest.fn();
  render(
    <CreateOrganizationDialog open onOpenChange={onOpenChange} onCreated={onCreated} {...extra} />
  );
  return { onOpenChange, onCreated };
}

describe("CreateOrganizationDialog", () => {
  it("refuses an empty name without calling the server", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a name");
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("creates by name, then closes and tells the page", () => {
    const { onOpenChange, onCreated } = renderDialog();
    fireEvent.change(screen.getByLabelText("Organization name"), { target: { value: "Acme" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(mockMutate).toHaveBeenCalledWith("Acme");
    act(() => capturedOpts.onSuccess?.({ name: "Acme" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCreated).toHaveBeenCalled();
  });

  it("shows the server's words when creation is refused", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("Organization name"), { target: { value: "Acme" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    act(() =>
      capturedOpts.onError?.({ message: "Request failed", response: { data: { detail: "platform role required" } } })
    );
    expect(screen.getByRole("alert")).toHaveTextContent("platform role required");
  });
});


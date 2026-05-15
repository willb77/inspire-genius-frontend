import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ConfirmDialog from "../ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders the trigger element", () => {
    render(
      <ConfirmDialog trigger={<button>Delete</button>} onConfirm={jest.fn()} />
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("shows the dialog when trigger is clicked", () => {
    render(
      <ConfirmDialog trigger={<button>Delete</button>} onConfirm={jest.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(screen.getByText("Please confirm to proceed.")).toBeInTheDocument();
  });

  it("shows custom title and description", () => {
    render(
      <ConfirmDialog
        trigger={<button>Go</button>}
        title="Custom Title"
        description="Custom description"
        onConfirm={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom description")).toBeInTheDocument();
  });

  it("calls onConfirm when Confirm button is clicked", async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <ConfirmDialog trigger={<button>Act</button>} onConfirm={onConfirm} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Act" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it("shows custom button text", () => {
    render(
      <ConfirmDialog
        trigger={<button>X</button>}
        confirmText="Yes, do it"
        cancelText="Nah"
        onConfirm={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "X" }));
    expect(screen.getByRole("button", { name: "Yes, do it" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nah" })).toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import DestructiveConfirmModal from "../DestructiveConfirmModal";

// Mock ModalDialog — exercise our component, not the dialog primitive.
jest.mock("@/components/shared/ModalDialog", () => ({
  __esModule: true,
  default: ({ open, title, children }: any) =>
    open ? (
      <div data-testid="modal" role="dialog" aria-label={title}>
        <h1>{title}</h1>
        <div data-testid="modal-body">{children}</div>
      </div>
    ) : null,
}));

// Mock Button to a plain button with stable testids — same pattern as
// ConfirmActionModal.test.tsx (project convention).
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    type,
  }: any) => (
    <button
      data-testid={
        variant === "destructive"
          ? "confirm-button"
          : variant === "secondary"
            ? "cancel-button"
            : "button"
      }
      onClick={onClick}
      disabled={disabled}
      type={type || "button"}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

// Mock Input — keep onChange/value semantics so we can simulate typing.
jest.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, ...rest }: any) => (
    <input
      data-testid="destructive-confirm-input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...rest}
    />
  ),
}));

describe("DestructiveConfirmModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    title: "Permanently delete user",
    description: "This is destructive.",
    confirmPhrase: "user@example.com",
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    render(<DestructiveConfirmModal {...defaultProps} open={false} />);
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  it("renders the title and the confirm phrase in the prompt", () => {
    render(<DestructiveConfirmModal {...defaultProps} />);
    expect(screen.getByText("Permanently delete user")).toBeInTheDocument();
    // The phrase appears in the label code-block above the input.
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("disables the confirm button until the phrase is typed verbatim", () => {
    render(<DestructiveConfirmModal {...defaultProps} />);
    const confirm = screen.getByTestId("confirm-button");
    const input = screen.getByTestId("destructive-confirm-input");

    expect(confirm).toBeDisabled();

    fireEvent.change(input, { target: { value: "wrong" } });
    expect(confirm).toBeDisabled();

    fireEvent.change(input, { target: { value: "user@example.com" } });
    expect(confirm).not.toBeDisabled();
  });

  it("trims whitespace before comparing", () => {
    render(<DestructiveConfirmModal {...defaultProps} />);
    const confirm = screen.getByTestId("confirm-button");
    const input = screen.getByTestId("destructive-confirm-input");

    fireEvent.change(input, { target: { value: "  user@example.com  " } });
    expect(confirm).not.toBeDisabled();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    render(<DestructiveConfirmModal {...defaultProps} />);
    const input = screen.getByTestId("destructive-confirm-input");
    fireEvent.change(input, { target: { value: "user@example.com" } });

    fireEvent.click(screen.getByTestId("confirm-button"));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange(false) when cancel is clicked", () => {
    render(<DestructiveConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("cancel-button"));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("clears the typed input when the modal is closed and reopened", () => {
    const { rerender } = render(<DestructiveConfirmModal {...defaultProps} />);
    const input = screen.getByTestId("destructive-confirm-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "user@example.com" } });
    expect(input.value).toBe("user@example.com");

    rerender(<DestructiveConfirmModal {...defaultProps} open={false} />);
    rerender(<DestructiveConfirmModal {...defaultProps} open={true} />);

    const reopenedInput = screen.getByTestId("destructive-confirm-input") as HTMLInputElement;
    expect(reopenedInput.value).toBe("");
    // Confirm button is disabled again on reopen
    expect(screen.getByTestId("confirm-button")).toBeDisabled();
  });

  it("shows 'Working...' label and disables confirm while loading", () => {
    render(<DestructiveConfirmModal {...defaultProps} loading={true} />);
    const input = screen.getByTestId("destructive-confirm-input");
    fireEvent.change(input, { target: { value: "user@example.com" } });

    const confirm = screen.getByTestId("confirm-button");
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveTextContent("Working...");
  });

  it("supports a fixed phrase like 'PURGE INACTIVE' independent of any email", () => {
    render(
      <DestructiveConfirmModal
        {...defaultProps}
        confirmPhrase="PURGE INACTIVE"
        confirmHint="phrase"
        confirmLabel="Purge 42 user(s)"
      />,
    );

    const confirm = screen.getByTestId("confirm-button");
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveTextContent("Purge 42 user(s)");

    fireEvent.change(screen.getByTestId("destructive-confirm-input"), {
      target: { value: "PURGE INACTIVE" },
    });
    expect(confirm).not.toBeDisabled();
  });
});

/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmActionModal from "../ConfirmActionModal";

// 🔹 Mock ModalDialog
jest.mock("@/components/shared/ModalDialog", () => ({
  __esModule: true,
  default: ({ open, title, description, footer, children }: any) =>
    open ? (
      <div data-testid="modal">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        <div data-testid="modal-body">{children}</div>
        <div data-testid="modal-footer">{footer}</div>
      </div>
    ) : null,
}));

// 🔹 Mock Button
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    className,
  }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  ),
}));

// 🔹 Mock Input
jest.mock("@/components/ui/input", () => ({
  Input: ({ value }: any) => (
    <input data-testid="input" value={value} readOnly />
  ),
}));

describe("ConfirmActionModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    title: "Deactivate Organization?",
    description: "Are you sure?",
    confirmLabel: "Confirm",
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders modal when open is true", () => {
    render(<ConfirmActionModal {...defaultProps} />);

    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByText("Deactivate Organization?")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  test("does not render when open is false", () => {
    render(<ConfirmActionModal {...defaultProps} open={false} />);

    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  test("renders fields correctly", () => {
    render(
      <ConfirmActionModal
        {...defaultProps}
        fields={[
          { label: "Organization Name", value: "Test Org" },
          { label: "Type", value: "Education" },
        ]}
      />
    );

    expect(screen.getByText("Organization Name")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();

    const inputs = screen.getAllByTestId("input");
    expect(inputs[0]).toHaveValue("Test Org");
    expect(inputs[1]).toHaveValue("Education");
  });

  test("calls onOpenChange(false) when Cancel is clicked", () => {
    render(<ConfirmActionModal {...defaultProps} />);

    const cancelButton = screen
      .getAllByTestId("button")
      .find((btn) => btn.textContent === "Cancel");

    fireEvent.click(cancelButton!);

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  test("calls onConfirm when confirm button is clicked", () => {
    render(<ConfirmActionModal {...defaultProps} />);

    const confirmButton = screen
      .getAllByTestId("button")
      .find((btn) => btn.textContent === "Confirm");

    fireEvent.click(confirmButton!);

    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  test("shows Processing... when confirmLoading is true", () => {
    render(
      <ConfirmActionModal
        {...defaultProps}
        confirmLoading={true}
      />
    );

    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  test("disables confirm button when confirmDisabled is true", () => {
    render(
      <ConfirmActionModal
        {...defaultProps}
        confirmDisabled={true}
      />
    );

    const confirmButton = screen
      .getAllByTestId("button")
      .find((btn) => btn.textContent === "Confirm");

    expect(confirmButton).toBeDisabled();
  });

  test("uses correct confirm variant", () => {
    render(
      <ConfirmActionModal
        {...defaultProps}
        confirmVariant="destructive"
      />
    );

    const confirmButton = screen
      .getAllByTestId("button")
      .find((btn) => btn.textContent === "Confirm");

    expect(confirmButton).toHaveAttribute("data-variant", "destructive");
  });

  test("does not render fields section when fields is empty", () => {
    render(<ConfirmActionModal {...defaultProps} fields={[]} />);

    expect(screen.queryByTestId("input")).not.toBeInTheDocument();
  });
});

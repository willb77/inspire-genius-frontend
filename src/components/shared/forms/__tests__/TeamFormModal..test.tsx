/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import TeamFormModal from "../TeamFormModal";

// ---------------- MOCK CONSTANTS ----------------
jest.mock("../teamForm.constants", () => ({
  TEAM_FORM_DEFAULTS: {
    name: "",
    email: "",
    role: "",
    status: "Active",
  },
  TEAM_FORM_RULES: {
    name: {},
    email: {},
    role: {},
    status: {},
  },
  TEAM_ROLES: ["Admin", "Manager", "Employee"],
}));

// ---------------- MOCK ModalFormFrame ----------------
jest.mock("@/components/shared/forms/ModalFormFrame", () => ({
  __esModule: true,
  default: ({ open, title, submitLabel, onSubmit, children }: any) =>
    open ? (
      <div data-testid="modal-frame">
        <h1>{title}</h1>
        {children({
          control: {},
        })}
        <button
          data-testid="submit-button"
          onClick={() =>
            onSubmit({
              name: "John Doe",
              email: "john@test.com",
              role: "Admin",
              status: "Active",
            })
          }
        >
          {submitLabel}
        </button>
      </div>
    ) : null,
}));

// ---------------- MOCK Form Components ----------------
jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input data-testid="input" {...props} />,
}));

jest.mock("@/components/ui/form", () => ({
  FormField: ({ render }: any) =>
    render({ field: { value: "", onChange: jest.fn() } }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormMessage: () => <span data-testid="form-message" />,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

// ---------------- TESTS ----------------

describe("TeamFormModal", () => {
  test("renders Add mode correctly", () => {
    render(
      <TeamFormModal
        open
        mode="add"
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    // Check title
    expect(
      screen.getByRole("heading", { name: "Add User" }),
    ).toBeInTheDocument();

    // Check submit button label
    expect(screen.getByTestId("submit-button")).toHaveTextContent("Add User");
  });

  test("renders Edit mode correctly", () => {
    render(
      <TeamFormModal
        open
        mode="edit"
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByText("Edit User")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  test("calls onSubmit when submit button is clicked", () => {
    const mockSubmit = jest.fn();

    render(
      <TeamFormModal
        open
        mode="add"
        onOpenChange={jest.fn()}
        onSubmit={mockSubmit}
      />,
    );

    fireEvent.click(screen.getByTestId("submit-button"));

    expect(mockSubmit).toHaveBeenCalledWith({
      name: "John Doe",
      email: "john@test.com",
      role: "Admin",
      status: "Active",
    });
  });

  test("uses custom title and submitLabel if provided", () => {
    render(
      <TeamFormModal
        open
        mode="add"
        title="Custom Title"
        submitLabel="Custom Submit"
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom Submit")).toBeInTheDocument();
  });

  test("does not render when open is false", () => {
    render(
      <TeamFormModal
        open={false}
        mode="add"
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("modal-frame")).not.toBeInTheDocument();
  });
});

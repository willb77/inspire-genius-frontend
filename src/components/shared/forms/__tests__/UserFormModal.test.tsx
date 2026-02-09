import { render, screen, fireEvent } from "@testing-library/react";
import UserFormModal from "../UserFormModal";

/* -------------------------------------------------
   MOCK ModalFormFrame (important)
------------------------------------------------- */
jest.mock("@/components/shared/forms/ModalFormFrame", () => ({
  __esModule: true,
  default: ({
    open,
    title,
    submitLabel,
    onSubmit,
    children,
    defaultValues,
  }: any) => {
    if (!open) return null;

    const mockForm = {
      control: {},
      handleSubmit: (cb: any) => () => cb(defaultValues),
    };

    return (
      <div>
        <h1>{title}</h1>
        <form onSubmit={mockForm.handleSubmit(onSubmit)}>
          {children(mockForm)}
          <button type="submit">{submitLabel}</button>
        </form>
      </div>
    );
  },
}));

/* -------------------------------------------------
   MOCK UI COMPONENTS
------------------------------------------------- */
jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock("@/components/ui/form", () => ({
  FormField: ({ render }: any) =>
    render({ field: { value: "", onChange: jest.fn() } }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormMessage: () => null,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

/* -------------------------------------------------
   TESTS
------------------------------------------------- */
describe("UserFormModal", () => {
  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    onSubmit: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders add mode with default title and submit label", () => {
    render(<UserFormModal {...baseProps} mode="add" />);

    expect(
      screen.getByRole("heading", { name: "Add User" }),
    ).toBeInTheDocument();

    // Submit button
    expect(
      screen.getByRole("button", { name: "Add User" }),
    ).toBeInTheDocument();
  });

  it("renders edit mode with default title and submit label", () => {
    render(<UserFormModal {...baseProps} mode="edit" />);

    expect(screen.getByText("Edit User")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Changes" }),
    ).toBeInTheDocument();
  });

  it("renders form fields", () => {
    render(<UserFormModal {...baseProps} mode="add" />);

    expect(screen.getByPlaceholderText("Enter First Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter Last Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter Email")).toBeInTheDocument();
  });

  it("makes email read-only in edit mode", () => {
    render(<UserFormModal {...baseProps} mode="edit" />);

    const email = screen.getByPlaceholderText("Enter Email");
    expect(email).toHaveAttribute("readonly");
  });

  it("shows status field in edit mode by default", () => {
    render(<UserFormModal {...baseProps} mode="edit" />);

    expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
  });

  it("does not show status field when allowStatusEdit is false", () => {
    render(
      <UserFormModal {...baseProps} mode="edit" allowStatusEdit={false} />,
    );

    expect(screen.queryByText("Status")).not.toBeInTheDocument();
  });

  it("calls onSubmit with form values", () => {
    const onSubmit = jest.fn();

    render(<UserFormModal {...baseProps} mode="add" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Add User" }));

    expect(onSubmit).toHaveBeenCalledWith({
      first_name: "",
      last_name: "",
      email: "",
      role: "",
      status: "Active",
    });
  });

  it("does not render when open is false", () => {
    render(<UserFormModal {...baseProps} open={false} mode="add" />);

    expect(screen.queryByText("Add User")).not.toBeInTheDocument();
  });

  it("merges defaultValues and submits them correctly", () => {
    const onSubmit = jest.fn();

    render(
      <UserFormModal
        open
        mode="edit"
        onOpenChange={jest.fn()}
        onSubmit={onSubmit}
        defaultValues={{
          first_name: "Alice",
          last_name: "Smith",
          email: "alice@test.com",
          status: "Deactivated",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onSubmit).toHaveBeenCalledWith({
      first_name: "Alice",
      last_name: "Smith",
      email: "alice@test.com",
      role: "",
      status: "Deactivated",
    });
  });

  it("uses custom submitLabel when provided", () => {
    render(
      <UserFormModal
        open
        mode="add"
        submitLabel="Create User Now"
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Create User Now" }),
    ).toBeInTheDocument();
  });
});

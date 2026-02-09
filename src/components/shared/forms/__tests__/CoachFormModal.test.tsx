import { render, screen, fireEvent } from "@testing-library/react";
import CoachFormModal from "../CoachFormModal";

/* -------------------------------------------------
  MOCK ModalFormFrame (core wrapper)
------------------------------------------------- */
jest.mock("@/components/shared/forms/ModalFormFrame", () => ({
  __esModule: true,
  default: ({ open, title, submitLabel, onSubmit, children }: any) => {
    if (!open) return null;

    // minimal fake react-hook-form object
    const form = {
      control: {},
      handleSubmit: (fn: any) => () =>
        fn({
          name: "Test Coach",
          category: "Fitness",
          status: "active",
          voice_description: "Test description",
        }),
    };

    return (
      <div>
        <h1>{title}</h1>
        {children(form)}
        <button onClick={form.handleSubmit(onSubmit)}>{submitLabel}</button>
      </div>
    );
  },
}));

/* -------------------------------------------------
  MOCK UI COMPONENTS
------------------------------------------------- */
jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input data-testid="input" {...props} />,
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props: any) => <textarea data-testid="textarea" {...props} />,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/form", () => ({
  FormField: ({ render }: any) =>
    render({ field: { value: "", onChange: jest.fn() } }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormMessage: () => null,
}));

/* -------------------------------------------------
  TESTS
------------------------------------------------- */
describe("CoachFormModal", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /* -------------------------------------------------
    RENDERING
  ------------------------------------------------- */
  it("does not render when open is false", () => {
    render(
      <CoachFormModal
        open={false}
        onOpenChange={jest.fn()}
        mode="add"
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.queryByText("Add Coach")).not.toBeInTheDocument();
  });

  it("renders add mode with default title", () => {
    render(
      <CoachFormModal
        open
        onOpenChange={jest.fn()}
        mode="add"
        onSubmit={jest.fn()}
      />,
    );

    const headings = screen.getAllByText("Add Coach");
    expect(headings.length).toBeGreaterThanOrEqual(1);

    expect(
      screen.getByRole("heading", { level: 1, name: "Add Coach" }),
    ).toBeInTheDocument();
  });

  it("renders edit mode with default title", () => {
    render(
      <CoachFormModal
        open
        onOpenChange={jest.fn()}
        mode="edit"
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByText("Edit Coach")).toBeInTheDocument();
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  /* -------------------------------------------------
    FIELDS
  ------------------------------------------------- */
  it("renders name and category inputs", () => {
    render(
      <CoachFormModal
        open
        onOpenChange={jest.fn()}
        mode="add"
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getAllByTestId("input")).toHaveLength(2);
  });

  it("renders description textarea", () => {
    render(
      <CoachFormModal
        open
        onOpenChange={jest.fn()}
        mode="add"
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByTestId("textarea")).toBeInTheDocument();
  });

  it("does not render status field in add mode", () => {
    render(
      <CoachFormModal
        open
        onOpenChange={jest.fn()}
        mode="add"
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.queryByText("Status")).not.toBeInTheDocument();
  });

  it("renders status field in edit mode", () => {
    render(
      <CoachFormModal
        open
        onOpenChange={jest.fn()}
        mode="edit"
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Deactivated")).toBeInTheDocument();
  });

  /* -------------------------------------------------
    DISABLED INPUTS
  ------------------------------------------------- */
  it("disables name and category fields in edit mode", () => {
    render(
      <CoachFormModal
        open
        onOpenChange={jest.fn()}
        mode="edit"
        onSubmit={jest.fn()}
      />,
    );

    const inputs = screen.getAllByTestId("input");
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  /* -------------------------------------------------
    SUBMISSION
  ------------------------------------------------- */
  it("calls onSubmit with form values", () => {
    const onSubmit = jest.fn();

    render(
      <CoachFormModal
        open
        onOpenChange={jest.fn()}
        mode="add"
        onSubmit={onSubmit}
      />,
    );

    const submitButton = screen.getByRole("button", {
      name: "Add Coach",
    });

    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Test Coach",
      category: "Fitness",
      status: "active",
      voice_description: "Test description",
    });
  });

  /* -------------------------------------------------
    DEFAULT VALUES
  ------------------------------------------------- */
  it("accepts defaultValues prop", () => {
    render(
      <CoachFormModal
        open
        onOpenChange={jest.fn()}
        mode="edit"
        defaultValues={{
          name: "Existing Coach",
          category: "Health",
        }}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByText("Edit Coach")).toBeInTheDocument();
  });

  /* -------------------------------------------------
    ACCESSIBILITY
  ------------------------------------------------- */
  it("renders submit button", () => {
    render(
      <CoachFormModal
        open
        onOpenChange={jest.fn()}
        mode="add"
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});

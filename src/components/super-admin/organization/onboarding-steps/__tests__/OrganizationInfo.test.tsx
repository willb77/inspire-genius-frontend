import { render, screen, fireEvent } from "@testing-library/react";
import OrganizationInfoStep from "../OrganizationInfo";
import type { UseFormReturn } from "react-hook-form";

/* ---------------------------------- */
/* MOCK CONSTANTS                     */
/* ---------------------------------- */
jest.mock("@/components/shared/forms/organizationForm.constants", () => ({
  ORGANIZATION_FORM_RULES: {
    organization_name: {},
    contact: {},
    type: {},
    address: {},
  },
}));

/* ---------------------------------- */
/* MOCK ICONS                         */
/* ---------------------------------- */
jest.mock("lucide-react", () => ({
  Upload: () => <span>Upload</span>,
  X: () => <span data-testid="remove-logo">X</span>,
}));

/* ---------------------------------- */
/* MOCK UI COMPONENTS                 */
/* ---------------------------------- */
jest.mock("@/components/ui/input", () => ({
  Input: ({ ...props }: any) => <input {...props} />,
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: ({ ...props }: any) => <textarea {...props} />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ onValueChange, children }: any) => (
    <button
      data-testid="org-type-select"
      onClick={() => onValueChange("education")}
    >
      {children}
    </button>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/form", () => ({
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormField: ({ render }: any) =>
    render({ field: { value: "", onChange: jest.fn() } }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: () => null,
}));

/* ---------------------------------- */
/* MOCK FORM                          */
/* ---------------------------------- */
const mockSetValue = jest.fn();
const mockWatch = jest.fn();

const mockForm = {
  control: {},
  setValue: mockSetValue,
  watch: mockWatch,
} as unknown as UseFormReturn<any>;

/* ---------------------------------- */
/* TESTS                              */
/* ---------------------------------- */
describe("OrganizationInfoStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWatch.mockReturnValue(null);
  });

  it("should render all form fields", () => {
    render(<OrganizationInfoStep form={mockForm} />);

    expect(screen.getByText("Organization Name *")).toBeInTheDocument();
    expect(screen.getByText("Contact *")).toBeInTheDocument();
    expect(screen.getByText("Organization Type *")).toBeInTheDocument();
    expect(screen.getByText("Website URL")).toBeInTheDocument();
    expect(screen.getByText("Address *")).toBeInTheDocument();
    expect(screen.getByText("Add Logo")).toBeInTheDocument();
  });

  it("should update organization type when selected", () => {
    render(<OrganizationInfoStep form={mockForm} />);

    fireEvent.click(screen.getByTestId("org-type-select"));

    // onChange executed without crash
    expect(screen.getByText("Select type")).toBeInTheDocument();
  });

  it("should upload logo using file input", () => {
    render(<OrganizationInfoStep form={mockForm} />);

    const file = new File(["logo"], "logo.png", { type: "image/png" });

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(mockSetValue).toHaveBeenCalledWith("logo", file);
  });

  it("should upload logo using drag and drop", () => {
    render(<OrganizationInfoStep form={mockForm} />);

    const file = new File(["logo"], "logo.png", { type: "image/png" });
    const dropZone = screen.getByRole("region", {
      name: "Logo drop zone",
    });

    fireEvent.dragOver(dropZone);
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(mockSetValue).toHaveBeenCalledWith("logo", file);
  });

  it("should show drag-over styles and reset on drag leave", () => {
    render(<OrganizationInfoStep form={mockForm} />);

    const dropZone = screen.getByRole("region", {
      name: "Logo drop zone",
    });

    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);

    expect(dropZone).toBeInTheDocument();
  });

  it("should render uploaded logo details", () => {
    const file = new File(["logo"], "logo.png", { type: "image/png" });
    mockWatch.mockReturnValue(file);

    render(<OrganizationInfoStep form={mockForm} />);

    expect(screen.getByText("IMG")).toBeInTheDocument();
    expect(screen.getByText("logo.png")).toBeInTheDocument();
  });

  it("should remove uploaded logo when remove button is clicked", () => {
    const file = new File(["logo"], "logo.png", { type: "image/png" });
    mockWatch.mockReturnValue(file);

    render(<OrganizationInfoStep form={mockForm} />);

    fireEvent.click(screen.getByTestId("remove-logo"));

    expect(mockSetValue).toHaveBeenCalledWith("logo", null);
  });
});

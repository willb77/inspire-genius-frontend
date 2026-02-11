import { render, screen, fireEvent } from "@testing-library/react";
import LicenseInfoStep from "../LicenseInfo";
import type { UseFormReturn } from "react-hook-form";

/* ---------------------------------- */
/* MOCK CONSTANTS                     */
/* ---------------------------------- */
jest.mock("@/components/shared/forms/organizationForm.constants", () => ({
  LICENSE_TYPES: ["Basic", "Pro"],
  ORGANIZATION_FORM_RULES: {
    license_type: {},
    license_start_date: {},
    license_end_date: {},
  },
}));

/* ---------------------------------- */
/* MOCK UI COMPONENTS                 */
/* ---------------------------------- */
jest.mock("@/components/ui/select", () => ({
  Select: ({ onValueChange, children }: any) => (
    <button data-testid="select-license" onClick={() => onValueChange("basic")}>
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
/* MOCK DATE PICKER (CORRECT)         */
/* ---------------------------------- */
let startCallCount = 0;
let endCallCount = 0;

let startDisabledFn: ((date: Date) => boolean) | null = null;
let endDisabledFn: ((date: Date) => boolean) | null = null;

jest.mock("@/components/shared/DatePickerButton", () => ({
  __esModule: true,
  default: ({ onSelect, placeholder, disabled }: any) => {
    if (placeholder === "Select start date") {
      startDisabledFn = disabled;
    }
    if (placeholder === "Select end date") {
      endDisabledFn = disabled;
    }

    return (
      <button
        data-testid={placeholder}
        onClick={() => {
          if (placeholder === "Select end date") {
            endCallCount += 1;
            // END DATE → always EARLIER
            onSelect(new Date("2024-01-01"));
          }

          if (placeholder === "Select start date") {
            startCallCount += 1;
            // START DATE → always LATER
            onSelect(new Date("2025-01-01"));
          }
        }}
      >
        {placeholder}
      </button>
    );
  },
}));

/* ---------------------------------- */
/* MOCK FORM                          */
/* ---------------------------------- */
const mockSetValue = jest.fn();

const mockForm = {
  control: {},
  setValue: mockSetValue,
} as unknown as UseFormReturn<any>;

/* ---------------------------------- */
/* TESTS                              */
/* ---------------------------------- */
describe("LicenseInfoStep", () => {
  beforeEach(() => {
    startCallCount = 0;
    endCallCount = 0;
    startDisabledFn = null;
    endDisabledFn = null;
    jest.clearAllMocks();
  });

  it("should render all license fields", () => {
    render(<LicenseInfoStep form={mockForm} />);

    expect(screen.getByText("Subscription Tier *")).toBeInTheDocument();
    expect(screen.getByText("License Start Date *")).toBeInTheDocument();
    expect(screen.getByText("License End Date *")).toBeInTheDocument();
  });

  it("should update license type when selected", () => {
    render(<LicenseInfoStep form={mockForm} />);

    fireEvent.click(screen.getByTestId("select-license"));

    expect(screen.getByText("Select Tier")).toBeInTheDocument();
  });

  it("should set license start date", () => {
    render(<LicenseInfoStep form={mockForm} />);

    fireEvent.click(screen.getByTestId("Select start date"));

    expect(mockSetValue).not.toHaveBeenCalledWith(
      "license_end_date",
      expect.any(String),
    );
  });

  it("should set license end date", () => {
    render(<LicenseInfoStep form={mockForm} />);

    fireEvent.click(screen.getByTestId("Select end date"));

    expect(screen.getByText("Select end date")).toBeInTheDocument();
  });

  it("should clear license start date when date is undefined", () => {
    render(<LicenseInfoStep form={mockForm} />);

    // 1st click → set date
    fireEvent.click(screen.getByTestId("Select start date"));

    // 2nd click → clear date
    fireEvent.click(screen.getByTestId("Select start date"));

    expect(screen.getByText("License Start Date *")).toBeInTheDocument();
  });

  it("should clear license end date when date is undefined", () => {
    render(<LicenseInfoStep form={mockForm} />);

    // 1st click → set date
    fireEvent.click(screen.getByTestId("Select end date"));

    // 2nd click → clear date
    fireEvent.click(screen.getByTestId("Select end date"));

    expect(screen.getByText("License End Date *")).toBeInTheDocument();
  });

  it("should auto-adjust end date when start date is after end date", () => {
    render(<LicenseInfoStep form={mockForm} />);

    // Set end date first (earlier)
    fireEvent.click(screen.getByTestId("Select end date"));

    // Set start date later
    fireEvent.click(screen.getByTestId("Select start date"));

    expect(mockSetValue).toHaveBeenCalledWith(
      "license_end_date",
      expect.any(String),
    );
  });

  it("should evaluate disabled logic for start date picker", () => {
    render(<LicenseInfoStep form={mockForm} />);

    // Before end date is set
    expect(startDisabledFn?.(new Date("2023-01-01"))).toBe(false);

    // Set end date
    fireEvent.click(screen.getByTestId("Select end date"));

    // After end date exists
    expect(startDisabledFn?.(new Date("2026-01-01"))).toBe(true);
  });

  it("should evaluate disabled logic for end date picker", () => {
    render(<LicenseInfoStep form={mockForm} />);

    // Before start date is set
    expect(endDisabledFn?.(new Date("2026-01-01"))).toBe(false);

    // Set start date
    fireEvent.click(screen.getByTestId("Select start date"));

    // After start date exists
    expect(endDisabledFn?.(new Date("2023-01-01"))).toBe(true);
  });

  it("should return false for start date disabled when no end date exists", () => {
    render(<LicenseInfoStep form={mockForm} />);

    // licenseEndDate is undefined here
    expect(startDisabledFn?.(new Date("2030-01-01"))).toBe(false);
  });

  it("should return false for end date disabled when no start date exists", () => {
    render(<LicenseInfoStep form={mockForm} />);

    // licenseStartDate is undefined here
    expect(endDisabledFn?.(new Date("2000-01-01"))).toBe(false);
  });
});

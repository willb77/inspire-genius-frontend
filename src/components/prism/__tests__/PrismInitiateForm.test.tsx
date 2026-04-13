import { render, screen } from "@testing-library/react";
import PrismInitiateForm from "../PrismInitiateForm";

/* Mock the Select components from shadcn which use Radix and fail in jsdom */
jest.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, defaultValue, disabled }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    defaultValue?: string;
    disabled?: boolean;
  }) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

/* Mock Switch which also uses Radix */
jest.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, disabled }: {
    checked?: boolean;
    onCheckedChange?: (v: boolean) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}));

describe("PrismInitiateForm", () => {
  it("renders the form title and description", () => {
    render(<PrismInitiateForm />);
    expect(screen.getByText("Request PRISM Assessment")).toBeInTheDocument();
    expect(screen.getByText(/register a user and request/i)).toBeInTheDocument();
  });

  it("renders all required text input fields", () => {
    render(<PrismInitiateForm />);
    expect(screen.getByPlaceholderText("Jane")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Smith")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("jane.smith@company.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Acme Corp")).toBeInTheDocument();
  });

  it("renders submit and clear buttons", () => {
    render(<PrismInitiateForm />);
    expect(screen.getByRole("button", { name: /request assessment/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear form/i })).toBeInTheDocument();
  });

  it("disables text inputs when disabled prop is true", () => {
    render(<PrismInitiateForm disabled />);
    expect(screen.getByPlaceholderText("Jane")).toBeDisabled();
    expect(screen.getByPlaceholderText("Smith")).toBeDisabled();
    expect(screen.getByPlaceholderText("jane.smith@company.com")).toBeDisabled();
    expect(screen.getByRole("button", { name: /request assessment/i })).toBeDisabled();
  });

  it("pre-fills default values", () => {
    render(
      <PrismInitiateForm
        defaultValues={{
          forename: "Alice",
          surname: "Wonder",
          email: "alice@test.com",
        }}
      />
    );
    expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Wonder")).toBeInTheDocument();
    expect(screen.getByDisplayValue("alice@test.com")).toBeInTheDocument();
  });

  it("renders section headings", () => {
    render(<PrismInitiateForm />);
    expect(screen.getByText("Candidate Details")).toBeInTheDocument();
    expect(screen.getByText("Questionnaire Configuration")).toBeInTheDocument();
    expect(screen.getByText("PRISM Options")).toBeInTheDocument();
  });
});

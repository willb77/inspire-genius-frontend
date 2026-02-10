import { render, screen, fireEvent } from "@testing-library/react";
import SACoachCard from "../SACoachCard";

/* -------------------------------------------------
  MOCKS
------------------------------------------------- */
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid="action-button"
    >
      {children}
    </button>
  ),
}));

jest.mock("lucide-react", () => ({
  RefreshCcw: (props: any) => <svg data-testid="refresh-icon" {...props} />,
  Loader2: (props: any) => <svg data-testid="loader-icon" {...props} />,
}));

/* -------------------------------------------------
  TESTS
------------------------------------------------- */
describe("SACoachCard", () => {
  const baseProps = {
    title: "AI Coach",
    isActive: true,
    onToggle: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* -------------------------------------------------
    RENDERING
  ------------------------------------------------- */
  it("renders title", () => {
    render(<SACoachCard {...baseProps} />);
    expect(screen.getByText("AI Coach")).toBeInTheDocument();
  });

  it("renders category when provided", () => {
    render(<SACoachCard {...baseProps} categoryName="Fitness" />);
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Fitness")).toBeInTheDocument();
  });

  it("does not render category section when categoryName is missing", () => {
    render(<SACoachCard {...baseProps} />);
    expect(screen.queryByText("Category")).not.toBeInTheDocument();
  });

  /* -------------------------------------------------
    BUTTON LABELS
  ------------------------------------------------- */
  it("shows Disable button when active", () => {
    render(<SACoachCard {...baseProps} isActive />);
    expect(screen.getByText("Disable")).toBeInTheDocument();
  });

  it("shows Enable button when inactive", () => {
    render(<SACoachCard {...baseProps} isActive={false} />);
    expect(screen.getByText("Enable")).toBeInTheDocument();
  });

  /* -------------------------------------------------
    ICON STATES
  ------------------------------------------------- */
  it("shows refresh icon when not loading", () => {
    render(<SACoachCard {...baseProps} />);
    expect(screen.getByTestId("refresh-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("loader-icon")).not.toBeInTheDocument();
  });

  it("shows loader icon when loading", () => {
    render(<SACoachCard {...baseProps} isLoading />);
    expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("refresh-icon")).not.toBeInTheDocument();
  });

  /* -------------------------------------------------
    DISABLED STATES
  ------------------------------------------------- */
  it("disables button when loading", () => {
    render(<SACoachCard {...baseProps} isLoading />);
    expect(screen.getByTestId("action-button")).toBeDisabled();
  });

  it("disables button when disabled prop is true", () => {
    render(<SACoachCard {...baseProps} disabled />);
    expect(screen.getByTestId("action-button")).toBeDisabled();
  });

  /* -------------------------------------------------
    INTERACTIONS
  ------------------------------------------------- */
  it("calls onToggle when button is clicked", () => {
    render(<SACoachCard {...baseProps} />);
    fireEvent.click(screen.getByTestId("action-button"));
    expect(baseProps.onToggle).toHaveBeenCalledTimes(1);
  });

  it("does not call onToggle when disabled", () => {
    render(<SACoachCard {...baseProps} disabled />);
    fireEvent.click(screen.getByTestId("action-button"));
    expect(baseProps.onToggle).not.toHaveBeenCalled();
  });

  it("does not call onToggle when loading", () => {
    render(<SACoachCard {...baseProps} isLoading />);
    fireEvent.click(screen.getByTestId("action-button"));
    expect(baseProps.onToggle).not.toHaveBeenCalled();
  });

  /* -------------------------------------------------
    ACCESSIBILITY
  ------------------------------------------------- */
  it("renders button element", () => {
    render(<SACoachCard {...baseProps} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});

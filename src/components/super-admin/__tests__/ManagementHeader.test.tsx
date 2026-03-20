import { render, screen, fireEvent } from "@testing-library/react";
import ManagementHeader from "../ManagementHeader";

/* -------------------------------------------------
  MOCK COMPONENTS
------------------------------------------------- */
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, className }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

jest.mock("lucide-react", () => ({
  Plus: ({ className }: any) => (
    <svg data-testid="plus-icon" className={className}>
      <title>Plus Icon</title>
    </svg>
  ),
}));

/* -------------------------------------------------
  TESTS
------------------------------------------------- */
describe("ManagementHeader Component", () => {
  const defaultProps = {
    title: "User Management",
    addLabel: "Add User",
    onAdd: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* -------------------------------------------------
    RENDERING TESTS
  ------------------------------------------------- */
  describe("Rendering", () => {
    it("renders the component", () => {
      render(<ManagementHeader {...defaultProps} />);
      expect(screen.getByText("User Management")).toBeInTheDocument();
    });

    it("displays the title correctly", () => {
      render(<ManagementHeader {...defaultProps} />);
      const title = screen.getByText("User Management");
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe("H1");
    });

    it("displays the add button with correct label", () => {
      render(<ManagementHeader {...defaultProps} />);
      expect(screen.getByText("Add User")).toBeInTheDocument();
    });

    it("renders the Plus icon", () => {
      render(<ManagementHeader {...defaultProps} />);
      expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
    });

    it("renders button inside the component", () => {
      render(<ManagementHeader {...defaultProps} />);
      expect(screen.getByTestId("button")).toBeInTheDocument();
    });
  });

  /* -------------------------------------------------
    PROPS TESTS
  ------------------------------------------------- */
  describe("Props", () => {
    it("renders with different title", () => {
      render(
        <ManagementHeader
          title="Coach Management"
          addLabel="Add Coach"
          onAdd={jest.fn()}
        />
      );
      expect(screen.getByText("Coach Management")).toBeInTheDocument();
    });

    it("renders with different add label", () => {
      render(
        <ManagementHeader
          title="Organization Management"
          addLabel="Create Organization"
          onAdd={jest.fn()}
        />
      );
      expect(screen.getByText("Create Organization")).toBeInTheDocument();
    });

    it("accepts custom onAdd handler", () => {
      const customHandler = jest.fn();
      render(
        <ManagementHeader
          title="Test"
          addLabel="Add"
          onAdd={customHandler}
        />
      );
      
      const button = screen.getByTestId("button");
      fireEvent.click(button);
      
      expect(customHandler).toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------
    INTERACTION TESTS
  ------------------------------------------------- */
  describe("Interactions", () => {
    it("calls onAdd when button is clicked", () => {
      const onAddMock = jest.fn();
      render(
        <ManagementHeader
          title="User Management"
          addLabel="Add User"
          onAdd={onAddMock}
        />
      );

      const button = screen.getByTestId("button");
      fireEvent.click(button);

      expect(onAddMock).toHaveBeenCalledTimes(1);
    });

    it("calls onAdd multiple times when button is clicked multiple times", () => {
      const onAddMock = jest.fn();
      render(
        <ManagementHeader
          title="User Management"
          addLabel="Add User"
          onAdd={onAddMock}
        />
      );

      const button = screen.getByTestId("button");
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(onAddMock).toHaveBeenCalledTimes(3);
    });

    it("does not call onAdd when component is rendered", () => {
      const onAddMock = jest.fn();
      render(
        <ManagementHeader
          title="User Management"
          addLabel="Add User"
          onAdd={onAddMock}
        />
      );

      expect(onAddMock).not.toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------
    STYLING TESTS
  ------------------------------------------------- */
  describe("Styling", () => {
    it("applies correct classes to title", () => {
      render(<ManagementHeader {...defaultProps} />);
      const title = screen.getByText("User Management");
      
      expect(title).toHaveClass(
        "text-2xl",
        "font-semibold",
        "tracking-tight",
        "text-left"
      );
    });

    it("applies correct container classes", () => {
      const { container } = render(<ManagementHeader {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveClass(
        "flex",
        "flex-col",
        "sm:flex-row",
        "items-start",
        "sm:items-center",
        "justify-between",
        "gap-2"
      );
    });

    it("applies correct classes to button container", () => {
      const { container } = render(<ManagementHeader {...defaultProps} />);
      const buttonContainer = container.querySelector(".flex.flex-wrap.items-center.gap-3");

      expect(buttonContainer).toBeInTheDocument();
      expect(buttonContainer).toHaveClass("flex", "flex-wrap", "items-center", "gap-3");
    });

    it("applies size-4 class to Plus icon", () => {
      render(<ManagementHeader {...defaultProps} />);
      const plusIcon = screen.getByTestId("plus-icon");
      
      expect(plusIcon).toHaveClass("size-4");
    });
  });

  /* -------------------------------------------------
    LAYOUT TESTS
  ------------------------------------------------- */
  describe("Layout", () => {
    it("renders title and button in the same component", () => {
      render(<ManagementHeader {...defaultProps} />);
      
      expect(screen.getByText("User Management")).toBeInTheDocument();
      expect(screen.getByText("Add User")).toBeInTheDocument();
    });

    it("button contains both icon and label", () => {
      render(<ManagementHeader {...defaultProps} />);
      const button = screen.getByTestId("button");
      
      expect(button).toContainElement(screen.getByTestId("plus-icon"));
      expect(button).toHaveTextContent("Add User");
    });
  });

  /* -------------------------------------------------
    EDGE CASES
  ------------------------------------------------- */
  describe("Edge Cases", () => {
    it("renders with empty string title", () => {
      render(
        <ManagementHeader
          title=""
          addLabel="Add"
          onAdd={jest.fn()}
        />
      );
      
      const title = screen.getByRole("heading", { level: 1 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent("");
    });

    it("renders with empty string add label", () => {
      render(
        <ManagementHeader
          title="Test"
          addLabel=""
          onAdd={jest.fn()}
        />
      );
      
      const button = screen.getByTestId("button");
      // Button should still render with just the icon
      expect(button).toBeInTheDocument();
      expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
    });

    it("renders with very long title", () => {
      const longTitle = "A".repeat(100);
      render(
        <ManagementHeader
          title={longTitle}
          addLabel="Add"
          onAdd={jest.fn()}
        />
      );
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("renders with very long add label", () => {
      const longLabel = "Add New Item With Very Long Label Text";
      render(
        <ManagementHeader
          title="Test"
          addLabel={longLabel}
          onAdd={jest.fn()}
        />
      );
      
      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it("renders with special characters in title", () => {
      render(
        <ManagementHeader
          title="User & Admin Management <>"
          addLabel="Add"
          onAdd={jest.fn()}
        />
      );
      
      expect(screen.getByText("User & Admin Management <>")).toBeInTheDocument();
    });

    it("renders with special characters in add label", () => {
      render(
        <ManagementHeader
          title="Test"
          addLabel="Add User & Save"
          onAdd={jest.fn()}
        />
      );
      
      expect(screen.getByText("Add User & Save")).toBeInTheDocument();
    });

    it("handles rapid button clicks", () => {
      const onAddMock = jest.fn();
      render(
        <ManagementHeader
          title="Test"
          addLabel="Add"
          onAdd={onAddMock}
        />
      );
      
      const button = screen.getByTestId("button");
      
      // Simulate rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }
      
      expect(onAddMock).toHaveBeenCalledTimes(10);
    });
  });

  /* -------------------------------------------------
    ACCESSIBILITY TESTS
  ------------------------------------------------- */
  describe("Accessibility", () => {
    it("title is a heading element", () => {
      render(<ManagementHeader {...defaultProps} />);
      const title = screen.getByRole("heading", { level: 1 });
      
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent("User Management");
    });

    it("button is accessible", () => {
      render(<ManagementHeader {...defaultProps} />);
      const button = screen.getByRole("button");
      
      expect(button).toBeInTheDocument();
    });

    it("Plus icon has accessible title", () => {
      render(<ManagementHeader {...defaultProps} />);
      const icon = screen.getByTestId("plus-icon");
      
      expect(icon).toContainHTML("<title>Plus Icon</title>");
    });
  });

  /* -------------------------------------------------
    RESPONSIVE LAYOUT TESTS
  ------------------------------------------------- */
  describe("Responsive Layout", () => {
    it("has flex-col class for mobile layout", () => {
      const { container } = render(<ManagementHeader {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveClass("flex-col");
    });

    it("has sm:flex-row class for larger screens", () => {
      const { container } = render(<ManagementHeader {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveClass("sm:flex-row");
    });

    it("has items-start for mobile alignment", () => {
      const { container } = render(<ManagementHeader {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveClass("items-start");
    });

    it("has sm:items-center for larger screen alignment", () => {
      const { container } = render(<ManagementHeader {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveClass("sm:items-center");
    });
  });

  /* -------------------------------------------------
    COMPONENT COMPOSITION TESTS
  ------------------------------------------------- */
  describe("Component Composition", () => {
    it("renders exactly one h1 element", () => {
      const { container } = render(<ManagementHeader {...defaultProps} />);
      const headings = container.querySelectorAll("h1");
      
      expect(headings).toHaveLength(1);
    });

    it("renders exactly one button", () => {
      render(<ManagementHeader {...defaultProps} />);
      const buttons = screen.getAllByRole("button");
      
      expect(buttons).toHaveLength(1);
    });

    it("renders exactly one Plus icon", () => {
      render(<ManagementHeader {...defaultProps} />);
      const icons = screen.getAllByTestId("plus-icon");
      
      expect(icons).toHaveLength(1);
    });

    it("button is a direct child of button container", () => {
      const { container } = render(<ManagementHeader {...defaultProps} />);
      const buttonContainer = container.querySelector(".flex.flex-wrap.items-center.gap-3");
      const button = screen.getByTestId("button");

      expect(buttonContainer).toContainElement(button);
    });
  });
});
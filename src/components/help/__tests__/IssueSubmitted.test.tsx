import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IssueSubmittedDialog from "../IssueSubmitted";
import type { IssueSubmittedDialogProps } from "@/types/help";

// Mock the UI components from shadcn/ui
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: React.ComponentPropsWithoutRef<"button">) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    <div data-testid="dialog" data-open={open}>
      {open && children}
    </div>
  ),
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p data-testid="dialog-description" className={className}>
      {children}
    </p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 data-testid="dialog-title" className={className}>
      {children}
    </h2>
  ),
}));

jest.mock("lucide-react", () => ({
  Headset: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="headset-icon" {...props}>
      <title>Headset Icon</title>
    </svg>
  ),
}));

describe("IssueSubmittedDialog Component", () => {
  // Mock functions
  const mockOnOpenChange = jest.fn();

  // Default props
  const defaultProps: IssueSubmittedDialogProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  /**
   * Test Suite: Component Rendering
   * Verifies that the component renders correctly with all expected elements
   */
  describe("Component Rendering", () => {
    test("should render dialog when open is true", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      // Verify dialog is rendered
      const dialog = screen.getByTestId("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("data-open", "true");
    });

    test("should not render dialog content when open is false", () => {
      render(<IssueSubmittedDialog open={false} onOpenChange={mockOnOpenChange} />);

      // Verify dialog exists but content is not rendered
      const dialog = screen.getByTestId("dialog");
      expect(dialog).toHaveAttribute("data-open", "false");
      
      // Dialog content should not be visible
      expect(screen.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    test("should render the Headset icon", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      // Verify the Headset icon is present
      const headsetIcon = screen.getByTestId("headset-icon");
      expect(headsetIcon).toBeInTheDocument();
    });

    test("should render dialog title with correct text", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      // Verify the title is rendered with correct text
      const title = screen.getByTestId("dialog-title");
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent("Issue Submitted");
    });

    test("should render dialog description with correct text", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      // Verify the description is rendered with correct text
      const description = screen.getByTestId("dialog-description");
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent(
        "Thanks for reaching out! We'll review your issue soon."
      );
    });

    test("should render Back button", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      // Verify the Back button is rendered
      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toBeInTheDocument();
    });
  });

  /**
   * Test Suite: Dialog Structure
   * Verifies the correct structure and organization of dialog elements
   */
  describe("Dialog Structure", () => {
    test("should have correct dialog content structure", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      // Verify dialog content has the correct class
      const dialogContent = screen.getByTestId("dialog-content");
      expect(dialogContent).toHaveClass("sm:max-w-md");
    });

    test("should have icon container with correct styling classes", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      // Find the icon container by its distinctive classes
      const dialogContent = screen.getByTestId("dialog-content");
      const iconContainer = dialogContent.querySelector(
        ".flex.h-10.w-10.items-center.justify-center.rounded-full.bg-blue-50.text-blue-600"
      );
      
      expect(iconContainer).toBeInTheDocument();
    });

    test("should render dialog header with title and description", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      const dialogHeader = screen.getByTestId("dialog-header");
      const title = within(dialogHeader).getByTestId("dialog-title");
      const description = within(dialogHeader).getByTestId("dialog-description");

      expect(title).toBeInTheDocument();
      expect(description).toBeInTheDocument();
    });

    test("should render dialog footer with Back button", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      const dialogFooter = screen.getByTestId("dialog-footer");
      const backButton = within(dialogFooter).getByRole("button", { name: /back/i });

      expect(backButton).toBeInTheDocument();
    });

    test("should apply center alignment to title", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      const title = screen.getByTestId("dialog-title");
      expect(title).toHaveClass("text-center");
    });

    test("should apply center alignment to description", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      const description = screen.getByTestId("dialog-description");
      expect(description).toHaveClass("text-center");
    });
  });

  /**
   * Test Suite: User Interactions
   * Tests user interactions with the dialog
   */
  describe("User Interactions", () => {
    test("should call onOpenChange with false when Back button is clicked", async () => {
      const user = userEvent.setup();
      
      render(<IssueSubmittedDialog {...defaultProps} />);

      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);

      // Verify onOpenChange was called with false
      expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    test("should have button type set to 'button' to prevent form submission", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toHaveAttribute("type", "button");
    });
  });

  /**
   * Test Suite: Button Styling
   * Tests the styling and appearance of the Back button
   */
  describe("Button Styling", () => {
    test("should render Back button with outline variant", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toHaveAttribute("variant", "outline");
    });

    test("should render Back button with full width class", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toHaveClass("w-full");
    });
  });

  /**
   * Test Suite: Icon Rendering
   * Tests the icon container and icon element
   */
  describe("Icon Rendering", () => {
    test("should render Headset icon with correct size classes", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      const headsetIcon = screen.getByTestId("headset-icon");
      expect(headsetIcon).toHaveClass("h-5", "w-5");
    });

    test("should render icon within a circular container", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      const dialogContent = screen.getByTestId("dialog-content");
      const iconContainer = dialogContent.querySelector(".rounded-full");
      
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass("rounded-full");
    });

    test("should apply blue color scheme to icon container", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      const dialogContent = screen.getByTestId("dialog-content");
      const iconContainer = dialogContent.querySelector(".bg-blue-50.text-blue-600");
      
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass("bg-blue-50", "text-blue-600");
    });
  });

  /**
   * Test Suite: Props Handling
   * Tests how the component handles different prop values
   */
  describe("Props Handling", () => {
    test("should respect the open prop when set to true", () => {
      render(<IssueSubmittedDialog open={true} onOpenChange={mockOnOpenChange} />);

      const dialog = screen.getByTestId("dialog");
      expect(dialog).toHaveAttribute("data-open", "true");
      
      // Dialog content should be visible
      expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
    });

    test("should respect the open prop when set to false", () => {
      render(<IssueSubmittedDialog open={false} onOpenChange={mockOnOpenChange} />);

      const dialog = screen.getByTestId("dialog");
      expect(dialog).toHaveAttribute("data-open", "false");
      
      // Dialog content should not be visible
      expect(screen.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    test("should call the provided onOpenChange callback", async () => {
      const user = userEvent.setup();
      const customOnOpenChange = jest.fn();
      
      render(<IssueSubmittedDialog open={true} onOpenChange={customOnOpenChange} />);

      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);

      expect(customOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  /**
   * Test Suite: Accessibility
   * Tests accessibility features of the component
   */
  describe("Accessibility", () => {
    test("should have semantic button element", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton.tagName).toBe("BUTTON");
    });

    test("should have descriptive text for screen readers", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      // Verify that the dialog has meaningful text content
      expect(screen.getByText("Issue Submitted")).toBeInTheDocument();
      expect(
        screen.getByText("Thanks for reaching out! We'll review your issue soon.")
      ).toBeInTheDocument();
    });

    test("should have accessible icon with title", () => {
      render(<IssueSubmittedDialog {...defaultProps} />);

      const headsetIcon = screen.getByTestId("headset-icon");
      const title = within(headsetIcon as HTMLElement).getByTitle("Headset Icon");
      
      expect(title).toBeInTheDocument();
    });
  });

  /**
   * Test Suite: Edge Cases
   * Tests edge cases and unusual scenarios
   */
  describe("Edge Cases", () => {
    test("should handle multiple rapid clicks on Back button", async () => {
      const user = userEvent.setup();
      
      render(<IssueSubmittedDialog {...defaultProps} />);

      const backButton = screen.getByRole("button", { name: /back/i });
      
      // Click multiple times rapidly
      await user.click(backButton);
      await user.click(backButton);
      await user.click(backButton);

      // onOpenChange should be called for each click
      expect(mockOnOpenChange).toHaveBeenCalledTimes(3);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    test("should render correctly when toggled between open and closed states", () => {
      const { rerender } = render(
        <IssueSubmittedDialog open={false} onOpenChange={mockOnOpenChange} />
      );

      // Initially closed
      expect(screen.queryByTestId("dialog-content")).not.toBeInTheDocument();

      // Open the dialog
      rerender(<IssueSubmittedDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByTestId("dialog-content")).toBeInTheDocument();

      // Close the dialog again
      rerender(<IssueSubmittedDialog open={false} onOpenChange={mockOnOpenChange} />);
      expect(screen.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });
  });
});
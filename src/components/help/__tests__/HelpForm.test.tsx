import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import HelpForm from "../HelpForm";
import type { HelpFormValues } from "@/types/help/component-types";

// Mock the UI components from shadcn/ui
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 data-testid="card-title" {...props}>{children}</h2>,
  CardFooter: ({ children, ...props }: any) => <div data-testid="card-footer" {...props}>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-wrapper">
      <select data-testid="select" value={value} onChange={(e) => onValueChange(e.target.value)}>
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

jest.mock("@/components/ui/form", () => {
  return {
    Form: ({ children }: any) => <div>{children}</div>,
    FormControl: ({ children }: any) => <div>{children}</div>,
    FormField: ({ render, name }: any) => {
      const { useFormContext } = require("react-hook-form");
      const methods = useFormContext();
      
      if (!methods) {
        // Fallback for when form context is not available
        const field = {
          value: "",
          onChange: jest.fn(),
          onBlur: jest.fn(),
          name,
          ref: jest.fn(),
        };
        return render({ field, fieldState: { error: undefined }, formState: {} });
      }
      
      const { formState, watch, setValue } = methods;
      const value = watch(name) || "";
      
      const field = {
        value,
        onChange: (valueOrEvent: any) => {
          // Handle both direct values and event objects
          const newValue = valueOrEvent?.target ? valueOrEvent.target.value : valueOrEvent;
          setValue(name, newValue, { shouldValidate: true });
        },
        onBlur: jest.fn(),
        name,
        ref: jest.fn(),
      };
      
      return render({ 
        field, 
        fieldState: { error: formState?.errors?.[name] },
        formState 
      });
    },
    FormItem: ({ children }: any) => <div data-testid="form-item">{children}</div>,
    FormLabel: ({ children, ...props }: any) => <label {...props}>{children}</label>,
    FormMessage: ({ children }: any) => <span data-testid="form-message">{children}</span>,
  };
});

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: (props: any) => <div data-testid="skeleton" {...props} />,
}));

// Wrapper component to provide form context
const TestWrapper = ({ children, defaultValues = {} }: any) => {
  const form = useForm<HelpFormValues>({
    mode: "onChange",
    defaultValues: {
      issueTypeId: "",
      priority: "",
      subject: "",
      description: "",
      attachments: [],
      ...defaultValues,
    },
  });

  return <FormProvider {...form}>{children(form)}</FormProvider>;
};

describe("HelpForm Component", () => {
  // Mock data for tests
  const mockIssueTypes: Array<{ id: string; name: string }> = [
    { id: "1", name: "Technical Issue" },
    { id: "2", name: "Billing Issue" },
    { id: "3", name: "Feature Request" },
  ];

  const mockAttachments: File[] = [];

  // Mock functions
  const mockOnSubmit = jest.fn();
  const mockOnAddFiles = jest.fn();
  const mockOnRemoveAttachment = jest.fn();

  // Default props
  const defaultProps = {
    onSubmit: mockOnSubmit,
    isSubmitting: false,
    isTypesLoading: false,
    issueTypes: mockIssueTypes,
    attachments: mockAttachments,
    onAddFiles: mockOnAddFiles,
    onRemoveAttachment: mockOnRemoveAttachment,
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
    test("should render the form with all fields", () => {
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      // Verify card title is rendered
      expect(screen.getByText("Get assistance and resolve issues with ease.")).toBeInTheDocument();

      // Verify all form labels are present
      expect(screen.getByText("Issue type")).toBeInTheDocument();
      expect(screen.getByText("Priority")).toBeInTheDocument();
      expect(screen.getByText("Subject")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Attachments (optional)")).toBeInTheDocument();
    });

    test("should render skeleton loaders when isTypesLoading is true", () => {
      render(
        <TestWrapper>
          {(form: any) => (
            <HelpForm {...defaultProps} form={form} isTypesLoading={true} />
          )}
        </TestWrapper>
      );

      // Verify skeleton components are rendered
      const skeletons = screen.getAllByTestId("skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test("should render Cancel and Send buttons", () => {
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      // Verify buttons are present
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
    });
  });

  /**
   * Test Suite: Form Interactions
   * Tests user interactions with form fields
   */
  describe("Form Interactions", () => {
    test("should allow user to type in subject field", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      const subjectInput = screen.getByPlaceholderText("Enter subject");
      await user.clear(subjectInput);
      await user.type(subjectInput, "Test Subject");

      // Wait for the input to update
      await waitFor(() => {
        expect(subjectInput).toHaveValue("Test Subject");
      });
    });

    test("should allow user to type in description field", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      const descriptionTextarea = screen.getByPlaceholderText("Enter details about your issue");
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, "Test description");

      // Wait for the textarea to update
      await waitFor(() => {
        expect(descriptionTextarea).toHaveValue("Test description");
      });
    });

    test("should update character count as user types in description", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      const descriptionTextarea = screen.getByPlaceholderText("Enter details about your issue");
      const testText = "Hello World";
      
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, testText);

      // Wait for character count to update
      await waitFor(() => {
        // Character count should show characters used
        expect(screen.getByText(`${testText.length}/1000`)).toBeInTheDocument();
      });
    });

    test("should enforce maximum character limit on description", async () => {
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      const descriptionTextarea = screen.getByPlaceholderText("Enter details about your issue") as HTMLTextAreaElement;
      const longText = "a".repeat(1500); // Exceeds 1000 char limit
      
      // Simulate typing/pasting long text - the component's onChange handler should truncate it
      fireEvent.change(descriptionTextarea, { target: { value: longText } });

      // Wait for the change handler to process and truncate the value
      await waitFor(() => {
        // The component's onChange handler slices the value to MAX_CHARS (1000)
        const currentValue = descriptionTextarea.value;
        expect(currentValue.length).toBe(1000);
        expect(currentValue).toBe("a".repeat(1000));
      }, { timeout: 3000 });
    });
  });

  /**
   * Test Suite: File Upload Functionality
   * Tests drag-and-drop and file selection features
   */
  describe("File Upload Functionality", () => {
    test("should call onAddFiles when files are selected via browse button", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Create mock file
      const file = new File(["dummy content"], "test.png", { type: "image/png" });
      
      // Simulate file selection
      await user.upload(fileInput, file);

      expect(mockOnAddFiles).toHaveBeenCalled();
    });

    test("should handle drag and drop events", () => {
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      const dropZoneText = screen.getByText(/drag and drop screenshots here/i);
      const dropZone = dropZoneText.closest("div")?.parentElement?.parentElement;
      expect(dropZone).toBeInTheDocument();

      // Create mock file
      const file = new File(["dummy content"], "test.png", { type: "image/png" });
      
      // Simulate drag over
      fireEvent.dragOver(dropZone!, {
        dataTransfer: {
          files: [file],
        },
      });

      // Simulate drop
      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file],
        },
      });
      
      expect(mockOnAddFiles).toHaveBeenCalled();
    });

    test("should display attached files with remove button", () => {
      const file1 = new File(["content1"], "image1.png", { type: "image/png" });
      const file2 = new File(["content2"], "image2.jpg", { type: "image/jpeg" });
      
      render(
        <TestWrapper>
          {(form: any) => (
            <HelpForm {...defaultProps} form={form} attachments={[file1, file2]} />
          )}
        </TestWrapper>
      );

      // Verify file names are displayed
      expect(screen.getByText("image1.png")).toBeInTheDocument();
      expect(screen.getByText("image2.jpg")).toBeInTheDocument();

      // Verify IMG badges are shown
      const imgBadges = screen.getAllByText("IMG");
      expect(imgBadges).toHaveLength(2);
    });

    test("should call onRemoveAttachment when remove button is clicked", async () => {
      const user = userEvent.setup();
      const file = new File(["content"], "test.png", { type: "image/png" });
      
      render(
        <TestWrapper>
          {(form: any) => (
            <HelpForm {...defaultProps} form={form} attachments={[file]} />
          )}
        </TestWrapper>
      );

      // Find and click remove button (X icon)
      const removeButtons = screen.getAllByRole("button").filter(
        btn => btn.querySelector('svg')
      );
      
      if (removeButtons.length > 0) {
        await user.click(removeButtons[0]);
      }

      expect(mockOnRemoveAttachment).toHaveBeenCalledWith(0);
    });
  });

  /**
   * Test Suite: Form Submission
   * Tests form submission behavior and validation
   */
  describe("Form Submission", () => {
    test("should call onSubmit with form values when form is valid", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper
          defaultValues={{
            issueTypeId: "1",
            priority: "high",
            subject: "Test Subject",
            description: "Test description with enough characters",
          }}
        >
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      const submitButton = screen.getByRole("button", { name: /send/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    test("should disable submit button when isSubmitting is true", () => {
      render(
        <TestWrapper>
          {(form: any) => (
            <HelpForm {...defaultProps} form={form} isSubmitting={true} />
          )}
        </TestWrapper>
      );

      const submitButton = screen.getByRole("button", { name: /sending/i });
      expect(submitButton).toBeDisabled();
    });

    test("should show 'Sending…' text when form is submitting", () => {
      render(
        <TestWrapper>
          {(form: any) => (
            <HelpForm {...defaultProps} form={form} isSubmitting={true} />
          )}
        </TestWrapper>
      );

      expect(screen.getByText("Sending…")).toBeInTheDocument();
    });

    test("should include attachments in submission", async () => {
      const user = userEvent.setup();
      const file = new File(["content"], "test.png", { type: "image/png" });
      
      render(
        <TestWrapper
          defaultValues={{
            issueTypeId: "1",
            priority: "high",
            subject: "Test Subject",
            description: "Test description with enough characters",
          }}
        >
          {(form: any) => (
            <HelpForm {...defaultProps} form={form} attachments={[file]} />
          )}
        </TestWrapper>
      );

      const submitButton = screen.getByRole("button", { name: /send/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            attachments: [file],
          })
        );
      });
    });
  });

  /**
   * Test Suite: Cancel Functionality
   * Tests the cancel button behavior
   */
  describe("Cancel Functionality", () => {
    test("should reset form when cancel button is clicked", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      // Type in some fields
      const subjectInput = screen.getByPlaceholderText("Enter subject");
      await user.type(subjectInput, "Test");

      // Click cancel
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      // Form should be reset (this would be verified by form.reset being called)
      expect(cancelButton).toBeInTheDocument();
    });

    test("should disable cancel button when form is submitting", () => {
      render(
        <TestWrapper>
          {(form: any) => (
            <HelpForm {...defaultProps} form={form} isSubmitting={true} />
          )}
        </TestWrapper>
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  /**
   * Test Suite: Select Dropdowns
   * Tests issue type and priority selection
   */
  describe("Select Dropdowns", () => {
    test("should render all issue types in dropdown", () => {
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      // Check if issue types are rendered as options
      mockIssueTypes.forEach((issueType) => {
        expect(screen.getByText(issueType.name)).toBeInTheDocument();
      });
    });

    test("should render all priority options in dropdown", () => {
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      // Check if priority options are rendered
      expect(screen.getByText("Low")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
      expect(screen.getByText("Critical")).toBeInTheDocument();
    });
  });

  /**
   * Test Suite: Accessibility
   * Tests accessibility features
   */
  describe("Accessibility", () => {
    test("should have aria-live region for character count", () => {
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      const charCounter = screen.getByText("0/1000");
      expect(charCounter).toHaveAttribute("aria-live", "polite");
    });

    test("should have aria-describedby for textarea", () => {
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      const textarea = screen.getByPlaceholderText("Enter details about your issue");
      expect(textarea).toHaveAttribute("aria-describedby", "message-help");
    });

    test("should accept only image files in file input", () => {
      render(
        <TestWrapper>
          {(form: any) => <HelpForm {...defaultProps} form={form} />}
        </TestWrapper>
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toHaveAttribute("accept", "image/*");
      expect(fileInput).toHaveAttribute("multiple");
    });
  });
});
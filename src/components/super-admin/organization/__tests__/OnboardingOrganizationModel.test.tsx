import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingOrganizationModel } from "../OnboardingOrganizationModel";

/* ---------------------------------- */
/* MOCK ICONS & BUTTON                */
/* ---------------------------------- */
jest.mock("lucide-react", () => ({
  X: () => <span data-testid="close-icon">X</span>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

/* ---------------------------------- */
/* HELPERS                            */
/* ---------------------------------- */
const steps = [
  { label: "Organization" },
  { label: "Coaches" },
  { label: "License" },
];

/* ---------------------------------- */
/* TESTS                              */
/* ---------------------------------- */
describe("OnboardingOrganizationModel", () => {
  it("should not render when open is false", () => {
    render(
      <OnboardingOrganizationModel
        open={false}
        title="Test Title"
        footer={<div>Footer</div>}
        onClose={jest.fn()}
      >
        Content
      </OnboardingOrganizationModel>
    );

    expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
  });

  it("should render title, children and footer when open", () => {
    render(
      <OnboardingOrganizationModel
        open
        title="Add Organization"
        footer={<div>Footer Content</div>}
        onClose={jest.fn()}
      >
        <div>Modal Body</div>
      </OnboardingOrganizationModel>
    );

    expect(screen.getByText("Add Organization")).toBeInTheDocument();
    expect(screen.getByText("Modal Body")).toBeInTheDocument();
    expect(screen.getByText("Footer Content")).toBeInTheDocument();
  });

  it("should render description when provided", () => {
    render(
      <OnboardingOrganizationModel
        open
        title="Title"
        description="This is a description"
        footer={<div>Footer</div>}
        onClose={jest.fn()}
      >
        Content
      </OnboardingOrganizationModel>
    );

    expect(screen.getByText("This is a description")).toBeInTheDocument();
  });

  it("should close modal when overlay is clicked", () => {
    const onOpenChange = jest.fn();

    render(
      <OnboardingOrganizationModel
        open
        title="Title"
        footer={<div>Footer</div>}
        onClose={jest.fn()}
        onOpenChange={onOpenChange}
      >
        Content
      </OnboardingOrganizationModel>
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should close modal on Enter key press on overlay", () => {
    const onOpenChange = jest.fn();

    render(
      <OnboardingOrganizationModel
        open
        title="Title"
        footer={<div>Footer</div>}
        onClose={jest.fn()}
        onOpenChange={onOpenChange}
      >
        Content
      </OnboardingOrganizationModel>
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Close" }), {
      key: "Enter",
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should call onClose and onOpenChange when close button is clicked", () => {
    const onClose = jest.fn();
    const onOpenChange = jest.fn();

    render(
      <OnboardingOrganizationModel
        open
        title="Title"
        footer={<div>Footer</div>}
        onClose={onClose}
        onOpenChange={onOpenChange}
      >
        Content
      </OnboardingOrganizationModel>
    );

    fireEvent.click(screen.getByTestId("close-icon"));

    expect(onClose).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should render progress steps when showProgress is true", () => {
    render(
      <OnboardingOrganizationModel
        open
        title="Title"
        steps={steps}
        currentStep={1}
        showProgress
        footer={<div>Footer</div>}
        onClose={jest.fn()}
      >
        Content
      </OnboardingOrganizationModel>
    );

    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Coaches")).toBeInTheDocument();
    expect(screen.getByText("License")).toBeInTheDocument();
  });

  it("should mark completed and current steps correctly", () => {
    render(
      <OnboardingOrganizationModel
        open
        title="Title"
        steps={steps}
        currentStep={2}
        showProgress
        footer={<div>Footer</div>}
        onClose={jest.fn()}
      >
        Content
      </OnboardingOrganizationModel>
    );

    // Completed step shows ✓
    expect(screen.getAllByText("✓").length).toBeGreaterThan(0);

    // Current step shows step number
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should not render progress when showProgress is false", () => {
    render(
      <OnboardingOrganizationModel
        open
        title="Title"
        steps={steps}
        showProgress={false}
        footer={<div>Footer</div>}
        onClose={jest.fn()}
      >
        Content
      </OnboardingOrganizationModel>
    );

    expect(screen.queryByText("Organization")).not.toBeInTheDocument();
  });
});

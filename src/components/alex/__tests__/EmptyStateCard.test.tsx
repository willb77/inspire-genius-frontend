import { render, screen, fireEvent } from "@testing-library/react";
import EmptyStateCard from "../EmptyStateCard";

// Mock the UI components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: string;
  }) => (
    <button data-testid="button" onClick={onClick} className={className} data-variant={variant}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/onboarding/OnboardingCallout", () => {
  return function OnboardingCallout({
    title,
    positionClass,
    className,
  }: {
    title: string;
    positionClass?: string;
    className?: string;
  }) {
    return (
      <div data-testid="onboarding-callout" className={`${positionClass} ${className}`}>
        {title}
      </div>
    );
  };
});

describe("EmptyStateCard", () => {
  const mockOnStart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the component", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    expect(screen.getByTestId("card")).toBeInTheDocument();
    expect(screen.getByTestId("card-content")).toBeInTheDocument();
  });

  it("should render all images", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const images = screen.getAllByRole("img");
    // There are 5 images total: 2 main images + 3 button icons
    expect(images).toHaveLength(5);

    const helpAlexImage = screen.getByAltText("Ask Alex");
    expect(helpAlexImage).toBeInTheDocument();
    expect(helpAlexImage).toHaveAttribute("src", "/images/user/home/help-alex.svg");

    const alexImage = screen.getByAltText("Alex");
    expect(alexImage).toBeInTheDocument();
    expect(alexImage).toHaveAttribute("src", "/images/user/home/alex-stars.svg");
  });

  it("should render main images with correct properties", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const helpAlexImage = screen.getByAltText("Ask Alex");
    expect(helpAlexImage).toHaveClass("h-64", "object-cover");

    const alexStarsImage = screen.getByAltText("Alex");
    expect(alexStarsImage).toHaveClass("absolute", "top-0", "right-0");
  });

  it("should render onboarding callouts with correct titles", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const callouts = screen.getAllByTestId("onboarding-callout");
    expect(callouts).toHaveLength(2);

    expect(screen.getByText("How can i help you?")).toBeInTheDocument();
    // Use regex to match the text flexibly
    expect(screen.getByText(/Hey/i)).toBeInTheDocument();
    expect(screen.getByText(/Alex/i)).toBeInTheDocument();
  });

it("should render callout titles correctly", () => {
  render(<EmptyStateCard onStart={mockOnStart} />);

  const callouts = screen.getAllByTestId("onboarding-callout");
  
  // Check the text content directly from the callouts
  expect(callouts[0].textContent).toBe("How can i help you?");
  // More flexible approach - check it contains the expected parts
  expect(callouts[1].textContent).toMatch(/Hey ,I.m Alex/);
  // Or check it starts with and ends with expected text
  expect(callouts[1].textContent).toContain("Hey ,");
  expect(callouts[1].textContent).toContain("m Alex");
});

  it("should render all three buttons", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const buttons = screen.getAllByTestId("button");
    expect(buttons).toHaveLength(3);
  });

  it("should render 'Take a Tour' button with correct properties", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const tourButton = screen.getByText("Take a Tour").closest("button");
    expect(tourButton).toBeInTheDocument();
    expect(tourButton).toHaveAttribute("data-variant", "secondary");
    expect(tourButton).toHaveClass("bg-blue-primary");

    const tourIcon = screen.getByAltText("Tour");
    expect(tourIcon).toBeInTheDocument();
    expect(tourIcon).toHaveAttribute("src", "/images/user/home/tour.svg");
  });

  it("should render 'How to use' button with correct properties", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const howToUseButton = screen.getByText("How to use").closest("button");
    expect(howToUseButton).toBeInTheDocument();
    expect(howToUseButton).toHaveAttribute("data-variant", "outline");
    expect(howToUseButton).toHaveClass("cursor-not-allowed");

    const howToUseIcon = screen.getByAltText("How to use");
    expect(howToUseIcon).toBeInTheDocument();
    expect(howToUseIcon).toHaveAttribute("src", "/images/user/home/how-to-use.svg");
  });

  it("should render 'Coaches Introduction' button with correct properties", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const coachesButton = screen.getByText("Coaches Introduction").closest("button");
    expect(coachesButton).toBeInTheDocument();
    expect(coachesButton).toHaveAttribute("data-variant", "destructive");
    expect(coachesButton).toHaveClass("cursor-not-allowed");

    const coachesIcon = screen.getByAltText("Coaches");
    expect(coachesIcon).toBeInTheDocument();
    expect(coachesIcon).toHaveAttribute("src", "/images/user/home/coaches.svg");
  });

  it("should call onStart when 'Take a Tour' button is clicked", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const tourButton = screen.getByText("Take a Tour").closest("button");
    fireEvent.click(tourButton!);

    expect(mockOnStart).toHaveBeenCalledTimes(1);
  });

  it("should not call onStart for other buttons", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const howToUseButton = screen.getByText("How to use").closest("button");
    const coachesButton = screen.getByText("Coaches Introduction").closest("button");

    fireEvent.click(howToUseButton!);
    fireEvent.click(coachesButton!);

    expect(mockOnStart).not.toHaveBeenCalled();
  });

  it("should render Card with correct className", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const card = screen.getByTestId("card");
    expect(card).toHaveClass("border-none", "shadow-none");
  });

  it("should render CardContent with correct className", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const cardContent = screen.getByTestId("card-content");
    expect(cardContent).toHaveClass("space-y-3", "relative");
  });

  it("should render all button icons with correct sizes", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const tourIcon = screen.getByAltText("Tour");
    const howToUseIcon = screen.getByAltText("How to use");
    const coachesIcon = screen.getByAltText("Coaches");

    expect(tourIcon).toHaveClass("w-5", "h-5");
    expect(howToUseIcon).toHaveClass("w-5", "h-5");
    expect(coachesIcon).toHaveClass("w-5", "h-5");
  });

  it("should render onboarding callouts with correct custom classes", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const callouts = screen.getAllByTestId("onboarding-callout");

    expect(callouts[0]).toHaveClass("!rounded-b-xl", "!rounded-tr-xl");
    expect(callouts[1]).toHaveClass("!rounded-b-xl", "!rounded-tr-xl", "!text-blue-primary");
  });

  it("should have correct positioning classes for onboarding callouts", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const callouts = screen.getAllByTestId("onboarding-callout");

    expect(callouts[0]).toHaveClass("z-10", "absolute");
    expect(callouts[1]).toHaveClass("z-10", "absolute");
  });

  it("should render buttons container with correct positioning", () => {
    const { container } = render(<EmptyStateCard onStart={mockOnStart} />);

    const buttonContainer = container.querySelector(".absolute.-bottom-12");
    expect(buttonContainer).toBeInTheDocument();
    expect(buttonContainer).toHaveClass("left-0", "w-full", "flex", "flex-col", "gap-2");
  });

  it("should render image container with correct height", () => {
    const { container } = render(<EmptyStateCard onStart={mockOnStart} />);

    const imageContainer = container.querySelector(".h-72");
    expect(imageContainer).toBeInTheDocument();
    expect(imageContainer).toHaveClass("relative", "flex", "items-center", "justify-center");
  });

  it("should render button text with correct spacing", () => {
    render(<EmptyStateCard onStart={mockOnStart} />);

    const tourSpan = screen.getByText("Take a Tour");
    const howToUseSpan = screen.getByText("How to use");
    const coachesSpan = screen.getByText("Coaches Introduction");

    expect(tourSpan).toHaveClass("ml-2");
    expect(howToUseSpan).toHaveClass("ml-2");
    expect(coachesSpan).toHaveClass("ml-2");
  });
});
/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import Terms from "../Terms";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: any) => <div data-testid="collapsible">{children}</div>,
  CollapsibleContent: ({ children }: any) => <div>{children}</div>,
  CollapsibleTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h1>{children}</h1>,
}));
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...rest }: any) => <button onClick={onClick} {...rest}>{children}</button>,
}));
jest.mock("lucide-react", () => ({
  ArrowLeft: () => <svg data-testid="arrow-left" />,
}));

describe("Terms", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the page title", () => {
    render(<Terms />);
    expect(screen.getByText("Terms & Conditions")).toBeInTheDocument();
  });

  it("renders last updated date", () => {
    render(<Terms />);
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it("renders all section titles", () => {
    render(<Terms />);
    expect(screen.getByText("Acceptance of Terms")).toBeInTheDocument();
    expect(screen.getByText("User Accounts")).toBeInTheDocument();
    expect(screen.getByText("Use of Services")).toBeInTheDocument();
    expect(screen.getByText("Content & Intellectual Property")).toBeInTheDocument();
    expect(screen.getByText("Termination")).toBeInTheDocument();
    expect(screen.getByText("Limitation of Liability")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("renders Back button that navigates back", () => {
    render(<Terms />);
    const backBtn = screen.getByText("Back");
    backBtn.click();
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("renders intro paragraph", () => {
    render(<Terms />);
    expect(screen.getByText(/Please read these Terms & Conditions carefully/)).toBeInTheDocument();
  });
});

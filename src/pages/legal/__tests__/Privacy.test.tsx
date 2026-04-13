/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import Privacy from "../Privacy";

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

describe("Privacy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the page title", () => {
    render(<Privacy />);
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });

  it("renders last updated date", () => {
    render(<Privacy />);
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it("renders all section titles", () => {
    render(<Privacy />);
    expect(screen.getByText("Information We Collect")).toBeInTheDocument();
    expect(screen.getByText("How We Use Information")).toBeInTheDocument();
    expect(screen.getByText("Data Sharing & Disclosure")).toBeInTheDocument();
    expect(screen.getByText("Data Retention")).toBeInTheDocument();
    expect(screen.getByText("Your Rights & Choices")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("renders Back button that navigates back", () => {
    render(<Privacy />);
    const backBtn = screen.getByText("Back");
    backBtn.click();
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("renders intro paragraph", () => {
    render(<Privacy />);
    expect(screen.getByText(/Your privacy is important to us/)).toBeInTheDocument();
  });
});

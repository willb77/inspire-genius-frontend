import { render, screen, fireEvent } from "@testing-library/react";
import ActionMenu from "../ActionMenu";

/* Mock Radix DropdownMenu — its portal-based content doesn't render in jsdom */
jest.mock("@/components/ui/dropdown-menu", () => {
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
      asChild ? <>{children}</> : <button>{children}</button>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="menu-content">{children}</div>,
    DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void; onSelect?: (e: Event) => void }) => (
      <div role="menuitem" onClick={onClick}>{children}</div>
    ),
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuSub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

describe("ActionMenu", () => {
  it("renders the trigger button with sr-only text", () => {
    render(<ActionMenu />);
    expect(screen.getByText("Open menu")).toBeInTheDocument();
  });

  it("renders View menu item when showView is true (default)", () => {
    render(<ActionMenu />);
    expect(screen.getByText("View")).toBeInTheDocument();
  });

  it("renders Edit and Resend items when enabled", () => {
    render(<ActionMenu showEdit showResend />);
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Resend")).toBeInTheDocument();
  });

  it("renders Deactivate and Delete items when enabled", () => {
    render(<ActionMenu showDeactivate showDelete />);
    expect(screen.getByText("Deactivate")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls onView when View is clicked", () => {
    const onView = jest.fn();
    render(<ActionMenu onView={onView} row="test-row" />);
    fireEvent.click(screen.getByText("View"));
    expect(onView).toHaveBeenCalledWith("test-row");
  });

  it("calls onResend when Resend is clicked", () => {
    const onResend = jest.fn();
    render(<ActionMenu onResend={onResend} showResend row="r1" />);
    fireEvent.click(screen.getByText("Resend"));
    expect(onResend).toHaveBeenCalledWith("r1");
  });

  it("shows Coaches item when showCoaches is true", () => {
    render(<ActionMenu showCoaches onCoaches={jest.fn()} />);
    expect(screen.getByText("Coaches")).toBeInTheDocument();
  });

  it("calls onDelete when Delete is clicked", () => {
    const onDelete = jest.fn();
    render(<ActionMenu showDelete onDelete={onDelete} row="d1" />);
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith("d1");
  });

  it("calls onDeactivate when Deactivate is clicked", () => {
    const onDeactivate = jest.fn();
    render(<ActionMenu showDeactivate onDeactivate={onDeactivate} row="x1" />);
    fireEvent.click(screen.getByText("Deactivate"));
    expect(onDeactivate).toHaveBeenCalledWith("x1");
  });
});

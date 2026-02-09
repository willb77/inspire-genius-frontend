import { render, screen, fireEvent } from "@testing-library/react";
import LicenseExpiring from "../LicenseExpiring";
import { useLicence } from "@/hooks/super-admin/dashboard/useLicence";

/* ------------------------------------------------------------------
 * MOCK HOOK
 * ------------------------------------------------------------------ */
jest.mock("@/hooks/super-admin/dashboard/useLicence", () => ({
  useLicence: jest.fn(),
}));

/* ------------------------------------------------------------------
 * MOCK ROUTER
 * ------------------------------------------------------------------ */
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

/* ------------------------------------------------------------------
 * MOCK UI COMPONENTS
 * ------------------------------------------------------------------ */
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

/* ------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------ */
describe("LicenseExpiring", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render loading skeletons when pending", () => {
    (useLicence as jest.Mock).mockReturnValue({
      data: undefined,
      isPending: true,
    });

    render(<LicenseExpiring />);

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("should render license items sorted by days until expiry and limited to 4", () => {
    (useLicence as jest.Mock).mockReturnValue({
      isPending: false,
      data: {
        data: {
          licenses: [
            {
              organization_name: "Org A",
              days_until_expiry: 30,
              subscription_tier: "Premium",
              status: "active",
            },
            {
              organization_name: "Org B",
              days_until_expiry: 5,
              subscription_tier: "Basic",
              status: "active",
            },
            {
              organization_name: "Org C",
              days_until_expiry: 15,
              subscription_tier: "Standard",
              status: "inactive",
            },
            {
              organization_name: "Org D",
              days_until_expiry: 1,
              subscription_tier: "Premium",
              status: "active",
            },
            {
              organization_name: "Org E",
              days_until_expiry: 60,
              subscription_tier: "Basic",
              status: "active",
            },
          ],
        },
      },
    });

    render(<LicenseExpiring />);

    // Should only render 4 items
    expect(screen.getAllByText(/days remaining/).length).toBe(4);

    // Sorted order: 1, 5, 15, 30
    expect(screen.getByText("1 days remaining")).toBeInTheDocument();
    expect(screen.getByText("5 days remaining")).toBeInTheDocument();
    expect(screen.getByText("15 days remaining")).toBeInTheDocument();
    expect(screen.getByText("30 days remaining")).toBeInTheDocument();

    // Org E (60 days) should NOT be rendered
    expect(screen.queryByText("60 days remaining")).not.toBeInTheDocument();
  });

  it("should render organization name, tier, and status", () => {
    (useLicence as jest.Mock).mockReturnValue({
      isPending: false,
      data: {
        data: {
          licenses: [
            {
              organization_name: "Org A",
              days_until_expiry: 10,
              subscription_tier: "Premium",
              status: "active",
            },
          ],
        },
      },
    });

    render(<LicenseExpiring />);

    expect(screen.getByText("Org A")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it('should navigate to licences page when "View all" is clicked', () => {
    (useLicence as jest.Mock).mockReturnValue({
      isPending: false,
      data: {
        data: {
          licenses: [],
        },
      },
    });

    render(<LicenseExpiring />);

    fireEvent.click(screen.getByText("View all"));

    expect(mockNavigate).toHaveBeenCalledWith(
      "/super-admin/dashboard/licences",
    );
  });

  it("should render title correctly", () => {
    (useLicence as jest.Mock).mockReturnValue({
      isPending: false,
      data: {
        data: {
          licenses: [],
        },
      },
    });

    render(<LicenseExpiring />);

    expect(screen.getByText("License Expiring")).toBeInTheDocument();
  });
  it("should handle licenses with missing days_until_expiry", () => {
    (useLicence as jest.Mock).mockReturnValue({
      isPending: false,
      data: {
        data: {
          licenses: [
            {
              organization_name: "Org A",
              // days_until_expiry missing
              subscription_tier: "Premium",
              status: "active",
            },
            {
              organization_name: "Org B",
              days_until_expiry: 5,
              subscription_tier: "Basic",
              status: "active",
            },
          ],
        },
      },
    });

    render(<LicenseExpiring />);

    const daysRemainingTexts = screen.getAllByText(/days\s+remaining/i);

    // One for Org A (blank), one for Org B (5 days)
    expect(daysRemainingTexts).toHaveLength(2);

    expect(screen.getByText(/5\s+days\s+remaining/i)).toBeInTheDocument();
  });
});

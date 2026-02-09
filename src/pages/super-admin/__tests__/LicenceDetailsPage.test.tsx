import { render, screen, fireEvent } from "@testing-library/react";
import LicenceDetailsPage from "../LicenceDetailsPage";

/* -------------------------------------------------
 MOCK LAYOUT
------------------------------------------------- */
jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

/* -------------------------------------------------
 MOCK UI COMPONENTS
------------------------------------------------- */
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

/* -------------------------------------------------
 MOCK ICONS
------------------------------------------------- */
jest.mock("lucide-react", () => ({
  ChevronLeft: () => <div />,
  Calendar: () => <div />,
  Building2: () => <div />,
}));

/* -------------------------------------------------
 MOCK PAGINATION
------------------------------------------------- */
jest.mock("@/components/shared/Pagination", () => (props: any) => (
  <button onClick={() => props.onPageChange(2)}>Next Page</button>
));

/* -------------------------------------------------
 MOCK HOOK
------------------------------------------------- */
jest.mock("@/hooks/super-admin/dashboard/useLicence", () => ({
  useLicence: jest.fn(),
}));

const { useLicence } = require("@/hooks/super-admin/dashboard/useLicence");

/* -------------------------------------------------
 TEST DATA
------------------------------------------------- */
const baseLicense = {
  id: "lic-1",
  organization_name: "Acme Corp",
  start_date: "2024-01-01",
  end_date: "2024-12-31",
  subscription_tier: "Premium",
  status: "Active",
};

/* -------------------------------------------------
 TESTS
------------------------------------------------- */
describe("LicenceDetailsPage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeletons when pending", () => {
    useLicence.mockReturnValue({
      isPending: true,
      data: null,
    });

    render(<LicenceDetailsPage />);

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders empty state when no licenses found", () => {
    useLicence.mockReturnValue({
      isPending: false,
      data: {
        data: {
          licenses: [],
          page: 1,
          limit: 10,
          total: 0,
        },
      },
    });

    render(<LicenceDetailsPage />);

    expect(screen.getByText("No licenses found")).toBeInTheDocument();
  });

  it("renders license details correctly", () => {
    useLicence.mockReturnValue({
      isPending: false,
      data: {
        data: {
          licenses: [baseLicense],
          page: 1,
          limit: 10,
          total: 1,
        },
      },
    });

    render(<LicenceDetailsPage />);

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText(/Jan 1, 2024 - Dec 31, 2024/i)).toBeInTheDocument();
  });

  it("handles different tier and status color branches", () => {
    useLicence.mockReturnValue({
      isPending: false,
      data: {
        data: {
          licenses: [
            {
              ...baseLicense,
              subscription_tier: "Enterprise",
              status: "Expired",
            },
          ],
          page: 1,
          limit: 10,
          total: 1,
        },
      },
    });

    render(<LicenceDetailsPage />);

    expect(screen.getByText("Enterprise")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("renders pagination info and changes page", () => {
    useLicence.mockReturnValue({
      isPending: false,
      data: {
        data: {
          licenses: [baseLicense],
          page: 1,
          limit: 10,
          total: 20,
        },
      },
    });

    render(<LicenceDetailsPage />);

    expect(screen.getByText(/of 20 results/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Next Page"));
  });

  it("handles back button click", () => {
    const backSpy = jest.spyOn(window.history, "back").mockImplementation();

    useLicence.mockReturnValue({
      isPending: false,
      data: {
        data: {
          licenses: [],
          page: 1,
          limit: 10,
          total: 0,
        },
      },
    });

    render(<LicenceDetailsPage />);

    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(backSpy).toHaveBeenCalled();
    backSpy.mockRestore();
  });

  it("uses default colors for unknown status and tier", () => {
    useLicence.mockReturnValue({
      isPending: false,
      data: {
        data: {
          licenses: [
            {
              id: "lic-x",
              organization_name: "Fallback Org",
              start_date: "2024-01-01",
              end_date: "2024-12-31",
              subscription_tier: "Basic",
              status: "Pending",
            },
          ],
          page: 1,
          limit: 10,
          total: 1,
        },
      },
    });

    render(<LicenceDetailsPage />);

    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});

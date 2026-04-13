/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ManagerTeam from "../Team";

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: any) => (
    <div data-testid={`data-card-${title}`}>{children}</div>
  ),
}));

jest.mock("@/components/dashboard/StatusBadge", () => ({
  __esModule: true,
  default: ({ label }: any) => <span data-testid="status-badge">{label}</span>,
}));

jest.mock("@/components/dashboard/ProgressBar", () => ({
  __esModule: true,
  default: ({ value }: any) => <div data-testid="progress-bar">{value}%</div>,
}));

jest.mock("@/components/dashboard/PlaceholderBanner", () => ({
  __esModule: true,
  default: () => <div data-testid="placeholder-banner" />,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

const mockRefetch = jest.fn();

jest.mock("@/hooks/manager/useManagerTeam", () => ({
  useManagerTeam: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

describe("ManagerTeam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within ManagerLayout", () => {
    render(<ManagerTeam />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<ManagerTeam />);
    expect(screen.getByText("admin:manager.teamManagement")).toBeInTheDocument();
  });

  it("renders summary stat cards", () => {
    render(<ManagerTeam />);
    expect(screen.getByText("Total Members")).toBeInTheDocument();
    expect(screen.getByText("Avg PRISM Score")).toBeInTheDocument();
    expect(screen.getByText("Goals On Track")).toBeInTheDocument();
    expect(screen.getByText("Training Completion")).toBeInTheDocument();
  });

  it("renders fallback team members in table", () => {
    render(<ManagerTeam />);
    expect(screen.getByText("Alex Thompson")).toBeInTheDocument();
    expect(screen.getByText("Senior Developer")).toBeInTheDocument();
    expect(screen.getByText("Maria Garcia")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<ManagerTeam />);
    expect(screen.getByText("Member")).toBeInTheDocument();
    expect(screen.getByText("PRISM Score")).toBeInTheDocument();
    expect(screen.getByText("Goals")).toBeInTheDocument();
    expect(screen.getByText("Training")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Last Active")).toBeInTheDocument();
  });

  it("renders training assignments section", () => {
    render(<ManagerTeam />);
    expect(screen.getByText("PRISM Fundamentals")).toBeInTheDocument();
    expect(screen.getByText("Leadership Essentials")).toBeInTheDocument();
    expect(screen.getByText("Communication Skills")).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useManagerTeam } = require("@/hooks/manager/useManagerTeam");
    (useManagerTeam as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ManagerTeam />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error message and retry button on error", () => {
    const { useManagerTeam } = require("@/hooks/manager/useManagerTeam");
    (useManagerTeam as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<ManagerTeam />);
    expect(screen.getByText("Failed to load data.")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });
});

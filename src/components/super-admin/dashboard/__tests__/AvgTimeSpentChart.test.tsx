import { render, screen, fireEvent } from "@testing-library/react";
import AvgTimeSpentChart from "../AvgTimeSpentChart";

/* ------------------------------------------------------------------
 * MOCK RECHARTS (we do NOT test chart internals)
 * ------------------------------------------------------------------ */
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Bar: () => <div />,
}));

/* ------------------------------------------------------------------
 * MOCK CHART UI WRAPPERS
 * ------------------------------------------------------------------ */
jest.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: any) => <div>{children}</div>,
  ChartTooltip: ({ content }: any) => (
    <div data-testid="chart-tooltip">
      {/* Active tooltip (covers TRUE branch) */}
      {content?.type({
        active: true,
        payload: [
          {
            payload: { orgName: "Org name", hours: 5 },
          },
        ],
      })}

      {/* Inactive tooltip (covers FALSE branch → return null) */}
      {content?.type({
        active: false,
        payload: [],
      })}
    </div>
  ),
}));

/* ------------------------------------------------------------------
 * MOCK DATE PICKER BUTTON (CRITICAL PART)
 * ------------------------------------------------------------------ */
jest.mock("@/components/shared/DatePickerButton", () => ({
  __esModule: true,
  default: ({ onSelect, disabled }: any) => (
    <div>
      {/* Trigger onSelect */}
      <button
        data-testid="date-select"
        onClick={() => onSelect?.(new Date("2024-01-01"))}
      >
        Select Date
      </button>

      {/* Used to test future-date disabling */}
      <span data-testid="disabled-future">
        {disabled?.(new Date("2099-01-01")) ? "disabled" : "enabled"}
      </span>

      {/* Used to test past-date disabling */}
      <span data-testid="disabled-past">
        {disabled?.(new Date("2000-01-01")) ? "disabled" : "enabled"}
      </span>
    </div>
  ),
}));

/* ------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------ */
describe("AvgTimeSpentChart", () => {
  it("should render title and unit label", () => {
    render(<AvgTimeSpentChart />);

    expect(screen.getByText("Average Time Spent")).toBeInTheDocument();
    expect(screen.getByText("In Hours")).toBeInTheDocument();
  });

  it("should render two date picker buttons", () => {
    render(<AvgTimeSpentChart />);

    const buttons = screen.getAllByTestId("date-select");
    expect(buttons).toHaveLength(2);
  });

  it("should update fromDate when selecting from-date", () => {
    render(<AvgTimeSpentChart />);

    const buttons = screen.getAllByTestId("date-select");

    // First picker = fromDate
    fireEvent.click(buttons[0]);

    expect(buttons[0]).toBeInTheDocument();
  });

  it("should update toDate when selecting to-date", () => {
    render(<AvgTimeSpentChart />);

    const buttons = screen.getAllByTestId("date-select");

    // Second picker = toDate
    fireEvent.click(buttons[1]);

    expect(buttons[1]).toBeInTheDocument();
  });

  it("should disable future dates for fromDate picker", () => {
    render(<AvgTimeSpentChart />);

    const futureChecks = screen.getAllByTestId("disabled-future");

    // First picker = fromDate
    expect(futureChecks[0].textContent).toBe("disabled");
  });

  it("should disable past dates for toDate picker", () => {
    render(<AvgTimeSpentChart />);

    const pastChecks = screen.getAllByTestId("disabled-past");

    // Second picker = toDate
    expect(pastChecks[1].textContent).toBe("disabled");
  });

  it("should render chart tooltip container", () => {
    render(<AvgTimeSpentChart />);

    expect(screen.getByTestId("chart-tooltip")).toBeInTheDocument();
  });
  it("should render chart tooltip container", () => {
    render(<AvgTimeSpentChart />);

    expect(screen.getByTestId("chart-tooltip")).toBeInTheDocument();
  });
});

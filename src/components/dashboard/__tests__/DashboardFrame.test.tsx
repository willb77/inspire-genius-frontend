import { render, screen, within } from "@testing-library/react";
import DashboardFrame from "../DashboardFrame";
import StatCard from "../StatCard";
import DataCard from "../DataCard";

const MockIcon = ({ className }: { className?: string }) => (
  <svg data-testid="mock-icon" className={className} />
);

const baseStat = {
  icon: MockIcon,
  iconColor: "text-blue-500",
  iconBg: "bg-blue-100",
};

describe("DashboardFrame", () => {
  it("renders title and subtitle in the welcome banner", () => {
    render(
      <DashboardFrame
        title="Welcome back, Jane"
        subtitle="Here's what's happening today."
        primary={<DataCard title="Primary card">primary body</DataCard>}
      />
    );
    expect(screen.getByText("Welcome back, Jane")).toBeInTheDocument();
    expect(screen.getByText("Here's what's happening today.")).toBeInTheDocument();
  });

  it("renders banner action children", () => {
    render(
      <DashboardFrame
        title="Hi"
        subtitle="Sub"
        bannerActions={<button>Take a tour</button>}
        primary={<DataCard title="Primary">x</DataCard>}
      />
    );
    expect(screen.getByRole("button", { name: "Take a tour" })).toBeInTheDocument();
  });

  it("renders the KPI strip with all StatCard children", () => {
    render(
      <DashboardFrame
        title="Hi"
        subtitle="Sub"
        kpis={
          <DashboardFrame.KpiStrip>
            <StatCard {...baseStat} label="Users" value={1234} />
            <StatCard {...baseStat} label="Sessions" value={56} />
            <StatCard {...baseStat} label="Satisfaction" value="92%" />
            <StatCard {...baseStat} label="Credits" value={789} />
          </DashboardFrame.KpiStrip>
        }
        primary={<DataCard title="Primary">x</DataCard>}
      />
    );

    const strip = screen.getByRole("list", { name: /key performance indicators/i });
    expect(strip).toBeInTheDocument();

    const items = within(strip).getAllByRole("listitem");
    expect(items).toHaveLength(4);

    expect(within(strip).getByText("Users")).toBeInTheDocument();
    expect(within(strip).getByText("Sessions")).toBeInTheDocument();
    expect(within(strip).getByText("Satisfaction")).toBeInTheDocument();
    expect(within(strip).getByText("Credits")).toBeInTheDocument();
  });

  it("renders primary slot content inside the primary section", () => {
    render(
      <DashboardFrame
        title="Hi"
        subtitle="Sub"
        primary={
          <>
            <DataCard title="Recent activity">recent body</DataCard>
            <DataCard title="Sessions this week">sessions body</DataCard>
          </>
        }
      />
    );

    const primary = screen.getByRole("region", { name: /primary dashboard content/i });
    expect(within(primary).getByText("Recent activity")).toBeInTheDocument();
    expect(within(primary).getByText("Sessions this week")).toBeInTheDocument();
  });

  it("renders side rail content when provided", () => {
    render(
      <DashboardFrame
        title="Hi"
        subtitle="Sub"
        primary={<DataCard title="Primary">x</DataCard>}
        side={
          <>
            <DataCard title="Upcoming events">events body</DataCard>
            <DataCard title="Quick actions">actions body</DataCard>
          </>
        }
      />
    );

    const side = screen.getByRole("complementary", { name: /side rail/i });
    expect(within(side).getByText("Upcoming events")).toBeInTheDocument();
    expect(within(side).getByText("Quick actions")).toBeInTheDocument();
  });

  it("omits the side rail when no side prop is provided", () => {
    render(
      <DashboardFrame
        title="Hi"
        subtitle="Sub"
        primary={<DataCard title="Primary">x</DataCard>}
      />
    );
    expect(screen.queryByRole("complementary", { name: /side rail/i })).not.toBeInTheDocument();
  });

  it("renders all four slots (title/subtitle, kpis, primary, side) together", () => {
    render(
      <DashboardFrame
        title="Welcome back"
        subtitle="Today's snapshot"
        kpis={
          <DashboardFrame.KpiStrip>
            <StatCard {...baseStat} label="Users" value={1} />
            <StatCard {...baseStat} label="Sessions" value={2} />
            <StatCard {...baseStat} label="Satisfaction" value={3} />
            <StatCard {...baseStat} label="Credits" value={4} />
          </DashboardFrame.KpiStrip>
        }
        primary={<DataCard title="Primary card">primary body</DataCard>}
        side={<DataCard title="Side card">side body</DataCard>}
      />
    );

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("Today's snapshot")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /key performance indicators/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /primary dashboard content/i })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /side rail/i })).toBeInTheDocument();
    expect(screen.getByText("Primary card")).toBeInTheDocument();
    expect(screen.getByText("Side card")).toBeInTheDocument();
  });
});

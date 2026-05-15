import { render, screen } from "@testing-library/react";
import DataCard from "../DataCard";

describe("DataCard", () => {
  it("renders title and children", () => {
    render(
      <DataCard title="Users">
        <p>User list content</p>
      </DataCard>
    );
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("User list content")).toBeInTheDocument();
  });

  it("renders badge when provided", () => {
    render(
      <DataCard title="Alerts" badge={5}>
        <div />
      </DataCard>
    );
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("does not render badge when not provided", () => {
    const { container } = render(
      <DataCard title="Info">
        <div />
      </DataCard>
    );
    expect(container.querySelector(".rounded-full")).not.toBeInTheDocument();
  });

  it("has accessible region role with title as label", () => {
    render(
      <DataCard title="Stats">
        <div />
      </DataCard>
    );
    expect(screen.getByRole("region", { name: "Stats" })).toBeInTheDocument();
  });
});

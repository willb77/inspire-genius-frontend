import { render, screen } from "@testing-library/react";
import DatePickerButton from "../DatePickerButton";

describe("DatePickerButton", () => {
  it("renders placeholder when no date is set", () => {
    render(<DatePickerButton onSelect={jest.fn()} />);
    expect(screen.getByText("Pick a date")).toBeInTheDocument();
  });

  it("renders custom placeholder", () => {
    render(<DatePickerButton onSelect={jest.fn()} placeholder="Select start" />);
    expect(screen.getByText("Select start")).toBeInTheDocument();
  });

  it("renders formatted date when date is provided", () => {
    render(
      <DatePickerButton
        date={new Date(2026, 0, 15)} // Jan 15 2026
        onSelect={jest.fn()}
      />
    );
    expect(screen.getByText("15-01-2026")).toBeInTheDocument();
  });

  it("renders with custom format string", () => {
    render(
      <DatePickerButton
        date={new Date(2026, 5, 1)} // Jun 1 2026
        onSelect={jest.fn()}
        formatStr="yyyy/MM/dd"
      />
    );
    expect(screen.getByText("2026/06/01")).toBeInTheDocument();
  });
});

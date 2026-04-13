import { render, screen, fireEvent } from "@testing-library/react";
import OtpInputField from "../OtpInputField";

describe("OtpInputField", () => {
  it("renders 6 input fields by default", () => {
    render(<OtpInputField value="" onChange={jest.fn()} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6);
  });

  it("renders custom length", () => {
    render(<OtpInputField value="" onChange={jest.fn()} length={4} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(4);
  });

  it("displays the current value across inputs", () => {
    render(<OtpInputField value="123456" onChange={jest.fn()} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveValue("1");
    expect(inputs[1]).toHaveValue("2");
    expect(inputs[5]).toHaveValue("6");
  });

  it("calls onChange when a digit is entered", () => {
    const onChange = jest.fn();
    render(<OtpInputField value="000000" onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith("500000");
  });

  it("handles paste of multiple digits", () => {
    const onChange = jest.fn();
    render(<OtpInputField value="      " onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => "987654" },
    });
    expect(onChange).toHaveBeenCalledWith("987654");
  });

  it("sets inputMode to numeric", () => {
    render(<OtpInputField value="" onChange={jest.fn()} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveAttribute("inputmode", "numeric");
  });
});

import { render, screen, fireEvent } from "@testing-library/react";
import { MeridianPanel, type MeridianQuickChip } from "../MeridianPanel";

describe("MeridianPanel", () => {
  const quickChips: MeridianQuickChip[] = [
    { label: "Goals", prompt: "Help me set a goal" },
  ];

  it("renders a greeting containing the firstName", () => {
    render(
      <MeridianPanel
        firstName="Will"
        onSend={jest.fn()}
        quickChips={quickChips}
        onQuickChip={jest.fn()}
      />,
    );
    expect(screen.getByText(/Will/)).toBeInTheDocument();
  });

  it("calls onQuickChip with the chip when a quick chip is clicked", () => {
    const onQuickChip = jest.fn();
    render(
      <MeridianPanel
        firstName="Will"
        onSend={jest.fn()}
        quickChips={quickChips}
        onQuickChip={onQuickChip}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Goals" }));
    expect(onQuickChip).toHaveBeenCalledTimes(1);
    expect(onQuickChip).toHaveBeenCalledWith(quickChips[0]);
  });

  it("calls onSend with trimmed typed text on Enter and clears the field", () => {
    const onSend = jest.fn();
    render(
      <MeridianPanel
        firstName="Will"
        onSend={onSend}
        quickChips={quickChips}
        onQuickChip={jest.fn()}
      />,
    );
    const input = screen.getByLabelText("Message Meridian") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Hello Meridian" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("Hello Meridian");
    expect(input.value).toBe("");
  });

  it("does nothing on submit when the input is empty", () => {
    const onSend = jest.fn();
    render(
      <MeridianPanel
        firstName="Will"
        onSend={onSend}
        quickChips={quickChips}
        onQuickChip={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).not.toHaveBeenCalled();
  });
});

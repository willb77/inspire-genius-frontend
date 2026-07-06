import { fireEvent, render, screen } from "@testing-library/react";

import {
  MeridianStarterCard,
  type PersonaChip,
} from "@/components/dashboard/v2/MeridianStarterCard";

const personas: PersonaChip[] = [
  { label: "Setting goals", prompt: "Help me set a goal" },
];

describe("MeridianStarterCard", () => {
  it("calls onAsk with the typed text when submitting via Enter", () => {
    const onAsk = jest.fn();
    const onPersona = jest.fn();
    render(
      <MeridianStarterCard
        onAsk={onAsk}
        onPersona={onPersona}
        personas={personas}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "How do I grow?" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onAsk).toHaveBeenCalledTimes(1);
    expect(onAsk).toHaveBeenCalledWith("How do I grow?");
    // field clears after submit
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("calls onAsk with trimmed text when clicking the send button", () => {
    const onAsk = jest.fn();
    const onPersona = jest.fn();
    render(
      <MeridianStarterCard
        onAsk={onAsk}
        onPersona={onPersona}
        personas={personas}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  hello there  " } });
    fireEvent.click(screen.getByRole("button", { name: /send to meridian/i }));

    expect(onAsk).toHaveBeenCalledWith("hello there");
  });

  it("calls onPersona with the chip object when a chip is clicked", () => {
    const onAsk = jest.fn();
    const onPersona = jest.fn();
    render(
      <MeridianStarterCard
        onAsk={onAsk}
        onPersona={onPersona}
        personas={personas}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /setting goals/i }));

    expect(onPersona).toHaveBeenCalledTimes(1);
    expect(onPersona).toHaveBeenCalledWith(personas[0]);
  });

  it("does not call onAsk when submitting empty/whitespace input", () => {
    const onAsk = jest.fn();
    const onPersona = jest.fn();
    render(
      <MeridianStarterCard
        onAsk={onAsk}
        onPersona={onPersona}
        personas={personas}
      />,
    );

    const input = screen.getByRole("textbox");
    // empty submit
    fireEvent.keyDown(input, { key: "Enter" });
    // whitespace-only submit
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /send to meridian/i }));

    expect(onAsk).not.toHaveBeenCalled();
  });
});

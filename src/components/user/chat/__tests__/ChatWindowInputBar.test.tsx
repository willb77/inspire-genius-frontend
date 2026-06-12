/**
 * @jest-environment jsdom
 */

import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import ChatWindowInputBar from "../ChatWindowInputBar";

// Wrapper that mirrors how MeridianChat owns the text state — the input
// bar is controlled, so onChange must round-trip the value or the
// keyDown handler will operate on stale state.
function Harness({
  onSend,
  initial = "",
}: {
  onSend: jest.Mock;
  initial?: string;
}) {
  const [text, setText] = useState(initial);
  return (
    <ChatWindowInputBar
      inputText={text}
      onInputTextChange={setText}
      onSend={() => {
        onSend(text);
      }}
      muteTooltipText="Mute"
    />
  );
}

describe("ChatWindowInputBar (T7)", () => {
  it("submits on Enter when the textarea has text", () => {
    const onSend = jest.fn();
    render(<Harness onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask anything/i);
    fireEvent.change(textarea, { target: { value: "Hello Meridian" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("Hello Meridian");
  });

  it("does NOT submit on Shift+Enter (newline insertion)", () => {
    const onSend = jest.fn();
    render(<Harness onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask anything/i);
    fireEvent.change(textarea, { target: { value: "Line one" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("does NOT submit while IME composition is active (composition event)", () => {
    const onSend = jest.fn();
    render(<Harness onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask anything/i);
    fireEvent.change(textarea, { target: { value: "こんにち" } });
    // Simulate the user being mid-composition (e.g. selecting a kanji
    // candidate). Enter at this point must finish the composition, not
    // send the message.
    fireEvent.compositionStart(textarea);
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();

    // After composition ends, Enter should send normally again.
    fireEvent.compositionEnd(textarea);
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("does NOT submit when nativeEvent.isComposing is true", () => {
    const onSend = jest.fn();
    render(<Harness onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask anything/i);
    fireEvent.change(textarea, { target: { value: "안녕" } });
    // Some browsers don't fire compositionstart on the React event but
    // still flag isComposing on the native KeyboardEvent. The keydown
    // handler must respect that flag.
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "isComposing", {
      value: true,
      configurable: true,
    });
    textarea.dispatchEvent(event);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("auto-grows by resetting style.height before measuring scrollHeight", () => {
    const onSend = jest.fn();
    render(<Harness onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask anything/i) as HTMLTextAreaElement;

    // Pin scrollHeight so the resize logic has a deterministic value.
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 80,
    });
    fireEvent.change(textarea, { target: { value: "Multi\nline\ninput" } });
    // After change the effect runs synchronously inside act(); the
    // textarea height should be the clamped scrollHeight value.
    expect(textarea.style.height).toBe("80px");
    expect(textarea.style.overflowY).toBe("hidden");
  });

  it("caps the auto-grown height at 240px and enables internal scroll", () => {
    const onSend = jest.fn();
    render(<Harness onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask anything/i) as HTMLTextAreaElement;

    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 500,
    });
    fireEvent.change(textarea, { target: { value: "x".repeat(2000) } });
    expect(textarea.style.height).toBe("240px");
    expect(textarea.style.overflowY).toBe("auto");
  });

  it("renders the send button with a 40x40 hit target (WCAG 2.1)", () => {
    const onSend = jest.fn();
    render(<Harness onSend={onSend} />);
    const sendBtn = screen.getByRole("button", { name: /send message/i });
    expect(sendBtn).toHaveClass("h-10");
    expect(sendBtn).toHaveClass("w-10");
  });
});

import { printTurn } from "../printTurn";
import { buildTurnHtml } from "../exportTurn";

const input = {
  speaker: "Personal coaching",
  body: "**How do I start?**\n\nBegin with the smallest thing you can finish.",
  timestamp: "30/07/2026:12:00:00",
};

afterEach(() => {
  document.querySelectorAll("iframe").forEach((f) => f.remove());
  jest.useRealTimers();
});

describe("printTurn", () => {
  test("refuses to print an empty response rather than emitting a blank page", () => {
    expect(() => printTurn({ ...input, body: "   " })).toThrow(/Nothing to print/);
    expect(document.querySelector("iframe")).toBeNull();
  });

  test("prints the same document the export builds", () => {
    printTurn(input);
    const frame = document.querySelector("iframe");
    expect(frame).not.toBeNull();
    expect(frame?.getAttribute("srcdoc")).toBe(buildTurnHtml(input));
  });

  test("uses an off-screen frame, not a popup a blocker would swallow", () => {
    // window.open would be silently dropped by a popup blocker, leaving the
    // user with nothing and no error to explain it.
    const openSpy = jest.spyOn(window, "open").mockReturnValue(null);
    printTurn(input);
    expect(openSpy).not.toHaveBeenCalled();
    const frame = document.querySelector("iframe") as HTMLIFrameElement;
    expect(frame.style.position).toBe("fixed");
    expect(frame.getAttribute("aria-hidden")).toBe("true");
    openSpy.mockRestore();
  });

  test("removes the frame once printing is done, and drops the backstop timer", () => {
    // Fake timers so the assertion below is about the pending-timer count, and
    // so no real 60s timer outlives the test and trips jest's teardown check.
    jest.useFakeTimers();
    printTurn(input);
    const frame = document.querySelector("iframe") as HTMLIFrameElement;
    const win = frame.contentWindow as Window & { print: () => void };
    const printSpy = jest.fn();
    Object.defineProperty(win, "print", { value: printSpy, configurable: true });

    frame.onload?.(new Event("load"));
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);

    win.dispatchEvent(new Event("afterprint"));
    expect(document.querySelector("iframe")).toBeNull();
    // The backstop fired its purpose already — leaving it pending would keep a
    // timer alive for a full minute after the frame is gone.
    expect(jest.getTimerCount()).toBe(0);
  });

  test("still cleans up when afterprint never fires", () => {
    // Some browsers return from print() synchronously and never fire the event.
    // Without the timer the page would accumulate a dead frame per printout.
    jest.useFakeTimers();
    printTurn(input);
    const frame = document.querySelector("iframe") as HTMLIFrameElement;
    const win = frame.contentWindow as Window & { print: () => void };
    Object.defineProperty(win, "print", { value: jest.fn(), configurable: true });

    frame.onload?.(new Event("load"));
    expect(document.querySelector("iframe")).not.toBeNull();

    jest.advanceTimersByTime(60_000);
    expect(document.querySelector("iframe")).toBeNull();
  });
});

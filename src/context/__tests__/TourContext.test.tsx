/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { TourContext } from "../tour-context";
import type { TourContextValue, TourStep } from "../tour-context";
import { useTour } from "../useTour";

// Mock dependencies for TourProvider
jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: "/home" }),
}));

jest.mock("@/hooks/useTourSpeech", () => ({
  useTourSpeech: () => ({
    phase: "idle",
    play: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    replay: jest.fn(),
    hasCached: () => false,
    stop: jest.fn(),
  }),
}));

jest.mock("@/hooks/useFrontendText", () => ({
  useFrontendText: () => ({ data: null }),
}));

jest.mock("@/lib/scroll", () => ({
  scrollToTarget: jest.fn(),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
}));

jest.mock("lucide-react", () => ({
  RotateCcw: () => <span data-testid="rotate-icon" />,
}));

describe("tour-context.ts — TourContext + useTour hook", () => {
  test("useTour throws when used outside TourContext provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTour())).toThrow(
      "useTour must be used within TourProvider"
    );
    spy.mockRestore();
  });

  test("useTour returns context value when inside provider", () => {
    const mockStart = jest.fn();
    const mockStop = jest.fn();
    const mockResolve = jest.fn().mockReturnValue(null);

    const value: TourContextValue = {
      start: mockStart,
      stop: mockStop,
      isRunning: false,
      step: null,
      resolveFrontendText: mockResolve,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TourContext.Provider value={value}>{children}</TourContext.Provider>
    );

    const { result } = renderHook(() => useTour(), { wrapper });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.step).toBeNull();
    expect(typeof result.current.start).toBe("function");
    expect(typeof result.current.stop).toBe("function");
  });

  test("start() is callable from context", () => {
    const mockStart = jest.fn();
    const value: TourContextValue = {
      start: mockStart,
      stop: jest.fn(),
      isRunning: false,
      step: null,
      resolveFrontendText: jest.fn().mockReturnValue(null),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TourContext.Provider value={value}>{children}</TourContext.Provider>
    );

    const { result } = renderHook(() => useTour(), { wrapper });
    act(() => result.current.start());
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  test("stop() is callable from context", () => {
    const mockStop = jest.fn();
    const value: TourContextValue = {
      start: jest.fn(),
      stop: mockStop,
      isRunning: true,
      step: { selector: '[data-tour="nav"]', title: "Nav", description: "Navigation bar" },
      resolveFrontendText: jest.fn().mockReturnValue(null),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TourContext.Provider value={value}>{children}</TourContext.Provider>
    );

    const { result } = renderHook(() => useTour(), { wrapper });
    act(() => result.current.stop());
    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  test("context provides current step when running", () => {
    const step: TourStep = {
      selector: '[data-tour="about"]',
      title: "About Prism",
      description: "Learn about PRISM",
      padding: 12,
      route: "/home",
    };

    const value: TourContextValue = {
      start: jest.fn(),
      stop: jest.fn(),
      isRunning: true,
      step,
      resolveFrontendText: jest.fn().mockReturnValue(null),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TourContext.Provider value={value}>{children}</TourContext.Provider>
    );

    const { result } = renderHook(() => useTour(), { wrapper });
    expect(result.current.step).toEqual(step);
    expect(result.current.isRunning).toBe(true);
  });

  test("resolveFrontendText is callable", () => {
    const mockResolve = jest.fn().mockReturnValue({
      id: "123",
      title: "Resolved Title",
      description: "Resolved Description",
    });

    const value: TourContextValue = {
      start: jest.fn(),
      stop: jest.fn(),
      isRunning: false,
      step: null,
      resolveFrontendText: mockResolve,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TourContext.Provider value={value}>{children}</TourContext.Provider>
    );

    const { result } = renderHook(() => useTour(), { wrapper });
    const resolved = result.current.resolveFrontendText({ selector: '[data-tour="nav"]' });
    expect(resolved).toEqual({
      id: "123",
      title: "Resolved Title",
      description: "Resolved Description",
    });
    expect(mockResolve).toHaveBeenCalledWith({ selector: '[data-tour="nav"]' });
  });
});

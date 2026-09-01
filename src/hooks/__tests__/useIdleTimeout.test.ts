/**
 * Idle session timeout.
 *
 * The cases that matter are the ones a naive `setTimeout` gets wrong:
 * a deadline that passed while the machine slept, and a second tab whose
 * activity must keep this one alive.
 */
import { renderHook, act } from "@testing-library/react"

import {
  useIdleTimeout,
  IDLE_TIMEOUT_MS,
  IDLE_STORAGE_KEY,
  clearIdleTracking,
} from "@/hooks/useIdleTimeout"

jest.mock("sonner", () => ({
  toast: {
    warning: jest.fn(),
    info: jest.fn(),
    dismiss: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe("useIdleTimeout", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    localStorage.clear()
  })
  afterEach(() => {
    jest.useRealTimers()
    clearIdleTracking()
  })

  it("does not sign out a user who is within the window", () => {
    const onTimeout = jest.fn()
    renderHook(() => useIdleTimeout(true, onTimeout))

    act(() => {
      jest.advanceTimersByTime(IDLE_TIMEOUT_MS - 60_000)
    })

    expect(onTimeout).not.toHaveBeenCalled()
  })

  it("signs out after the idle window elapses", () => {
    const onTimeout = jest.fn()
    renderHook(() => useIdleTimeout(true, onTimeout))

    act(() => {
      jest.advanceTimersByTime(IDLE_TIMEOUT_MS + 30_000)
    })

    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it("fires only once, not on every subsequent poll", () => {
    const onTimeout = jest.fn()
    renderHook(() => useIdleTimeout(true, onTimeout))

    act(() => {
      jest.advanceTimersByTime(IDLE_TIMEOUT_MS * 2)
    })

    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it("does nothing when there is no session", () => {
    const onTimeout = jest.fn()
    renderHook(() => useIdleTimeout(false, onTimeout))

    act(() => {
      jest.advanceTimersByTime(IDLE_TIMEOUT_MS * 2)
    })

    expect(onTimeout).not.toHaveBeenCalled()
  })

  it("honours activity recorded by ANOTHER TAB", () => {
    // Two tabs share one session. If tab B is being used, tab A must not
    // sign the user out — which is why the stamp lives in localStorage
    // rather than in component state.
    const onTimeout = jest.fn()
    renderHook(() => useIdleTimeout(true, onTimeout))

    act(() => {
      jest.advanceTimersByTime(IDLE_TIMEOUT_MS - 60_000)
      // Tab B writes a fresh stamp.
      localStorage.setItem(IDLE_STORAGE_KEY, String(Date.now()))
      jest.advanceTimersByTime(120_000)
    })

    expect(onTimeout).not.toHaveBeenCalled()
  })

  it("signs out on a deadline that passed while the machine slept", () => {
    // Timers do not run during suspend, so the deadline must be evaluated
    // from wall-clock rather than accumulated ticks. Simulate waking up to
    // a stamp that is already two hours old.
    const onTimeout = jest.fn()
    renderHook(() => useIdleTimeout(true, onTimeout))

    act(() => {
      localStorage.setItem(
        IDLE_STORAGE_KEY,
        String(Date.now() - IDLE_TIMEOUT_MS - 60 * 60 * 1000),
      )
      // A single poll is enough — no need to "replay" the sleep.
      jest.advanceTimersByTime(20_000)
    })

    expect(onTimeout).toHaveBeenCalledTimes(1)
  })
})

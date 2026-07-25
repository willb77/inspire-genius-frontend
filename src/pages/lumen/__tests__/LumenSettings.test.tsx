import { render, screen, fireEvent } from "@testing-library/react"
import LumenSettings from "../LumenSettings"
import { useConsent, useUpdateConsent } from "@/hooks/lumen/useConsent"
import type { LumenConsent } from "@/types/lumen"

jest.mock("@/hooks/lumen/useConsent")

const mockUseConsent = useConsent as jest.MockedFunction<typeof useConsent>
const mockUseUpdateConsent = useUpdateConsent as jest.MockedFunction<
  typeof useUpdateConsent
>

const DEFAULTS: LumenConsent = {
  proactive: true,
  calendar: false,
  email: false,
  is_default: true,
}

function setup({
  consent = DEFAULTS as LumenConsent | undefined,
  isLoading = false,
  isError = false,
  update = jest.fn(),
} = {}) {
  mockUseConsent.mockReturnValue({
    data: consent,
    isLoading,
    isError,
  } as ReturnType<typeof useConsent>)
  mockUseUpdateConsent.mockReturnValue({
    mutate: update,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateConsent>)
  return { update }
}

describe("LumenSettings", () => {
  afterEach(() => jest.resetAllMocks())

  test("shows the three grants separately", () => {
    setup()
    render(<LumenSettings />)
    expect(screen.getByLabelText("Moments in my feed")).toBeInTheDocument()
    expect(screen.getByLabelText("Use my bookings for timing")).toBeInTheDocument()
    expect(screen.getByLabelText("Email me Moments")).toBeInTheDocument()
  })

  test("reflects the documented defaults", () => {
    setup()
    render(<LumenSettings />)
    expect(screen.getByLabelText("Moments in my feed")).toBeChecked()
    expect(screen.getByLabelText("Use my bookings for timing")).not.toBeChecked()
    expect(screen.getByLabelText("Email me Moments")).not.toBeChecked()
  })

  test("says so when the user has never made a choice", () => {
    setup()
    render(<LumenSettings />)
    expect(screen.getByText(/haven't changed these yet/)).toBeInTheDocument()
  })

  test("does not claim defaults once a choice has been saved", () => {
    setup({ consent: { ...DEFAULTS, is_default: false } })
    render(<LumenSettings />)
    expect(screen.queryByText(/haven't changed these yet/)).not.toBeInTheDocument()
  })

  test("toggling a grant sends only that field", () => {
    const { update } = setup()
    render(<LumenSettings />)
    fireEvent.click(screen.getByLabelText("Use my bookings for timing"))
    expect(update).toHaveBeenCalledWith({ calendar: true })
  })

  test("toggling off sends false", () => {
    const { update } = setup({ consent: { ...DEFAULTS, calendar: true } })
    render(<LumenSettings />)
    fireEvent.click(screen.getByLabelText("Use my bookings for timing"))
    expect(update).toHaveBeenCalledWith({ calendar: false })
  })

  test("is honest that email delivery isn't available yet", () => {
    setup()
    render(<LumenSettings />)
    expect(screen.getByText(/not yet available/)).toBeInTheDocument()
  })

  test("is honest that the work calendar isn't visible to Lumen", () => {
    setup()
    render(<LumenSettings />)
    expect(screen.getByText(/can't see your work calendar/)).toBeInTheDocument()
  })

  test("shows a skeleton while loading", () => {
    setup({ consent: undefined, isLoading: true })
    render(<LumenSettings />)
    expect(screen.getByTestId("consent-loading")).toBeInTheDocument()
  })

  test("an error leaves existing choices alone and says so", () => {
    setup({ consent: undefined, isError: true })
    render(<LumenSettings />)
    expect(screen.getByText(/couldn't load your settings/)).toBeInTheDocument()
    expect(screen.getByText(/existing choices are unchanged/)).toBeInTheDocument()
  })
})

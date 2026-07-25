import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import LumenOnboarding from "../onboarding/LumenOnboarding"
import {
  useOnboardingStatus,
  useRequestPrismSurvey,
} from "@/hooks/lumen/useOnboarding"
import type { OnboardingStatus } from "@/types/lumen"

jest.mock("@/hooks/lumen/useOnboarding")

const mockStatus = useOnboardingStatus as jest.MockedFunction<typeof useOnboardingStatus>
const mockRequest = useRequestPrismSurvey as jest.MockedFunction<
  typeof useRequestPrismSurvey
>

const BASE: OnboardingStatus = {
  next_step: "request_prism",
  has_portrait: false,
  instruments: [],
  prism_request: null,
}

function setup({
  status = BASE as OnboardingStatus | undefined,
  isLoading = false,
  request = jest.fn(),
  created = undefined as { request_id: string; survey_url: string | null; status: string } | undefined,
  isPending = false,
  isError = false,
} = {}) {
  mockStatus.mockReturnValue({
    data: status,
    isLoading,
  } as ReturnType<typeof useOnboardingStatus>)
  mockRequest.mockReturnValue({
    mutate: request,
    data: created,
    isPending,
    isError,
  } as unknown as ReturnType<typeof useRequestPrismSurvey>)
  return { request }
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <LumenOnboarding />
    </MemoryRouter>
  )

describe("LumenOnboarding", () => {
  afterEach(() => jest.resetAllMocks())

  test("opens on the survey request step", () => {
    setup()
    renderPage()
    expect(screen.getByText("Let's start with how you're wired")).toBeInTheDocument()
    expect(screen.getByLabelText("First name")).toBeInTheDocument()
  })

  test("requests the survey with the entered name", () => {
    const { request } = setup()
    renderPage()
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Solo" } })
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "User" } })
    fireEvent.click(screen.getByRole("button", { name: /Send me the questionnaire/ }))
    expect(request).toHaveBeenCalledWith({ forename: "Solo", surname: "User" })
  })

  test("will not request without both names", () => {
    setup()
    renderPage()
    expect(
      screen.getByRole("button", { name: /Send me the questionnaire/ })
    ).toBeDisabled()
  })

  test("offers the questionnaire link once one exists", () => {
    setup({
      status: {
        ...BASE,
        next_step: "complete_survey",
        prism_request: {
          request_id: "r-1",
          survey_url: "https://prism.example/s/1",
          requested_at: null,
          completed_at: null,
          ingest_status: "pending",
        },
      },
    })
    renderPage()
    expect(screen.getByText("Your questionnaire is ready")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Open the questionnaire/ })).toHaveAttribute(
      "href",
      "https://prism.example/s/1"
    )
  })

  test("tells the user there is nothing to do while awaiting the report", () => {
    setup({ status: { ...BASE, next_step: "awaiting_report" } })
    renderPage()
    expect(screen.getByText("Results are on their way")).toBeInTheDocument()
    expect(screen.getByText(/nothing for you to do/)).toBeInTheDocument()
  })

  test("routes to the Self-Portrait once ready", () => {
    setup({ status: { ...BASE, next_step: "ready", has_portrait: true } })
    renderPage()
    expect(screen.getByRole("link", { name: /See my Self-Portrait/ })).toHaveAttribute(
      "href",
      "/vertical/lumen/self-portrait"
    )
  })

  test("never shows a price, plan, or checkout", () => {
    // §7: access is granted, not purchased. A paygate appearing here would be a
    // product-level regression, not a styling one.
    setup()
    renderPage()
    for (const forbidden of [/checkout/i, /subscribe/i, /per month/i, /\$\d/, /choose a plan/i]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
    }
    expect(screen.getByText(/Nothing here costs anything/)).toBeInTheDocument()
  })

  test("shows a skeleton while loading", () => {
    setup({ status: undefined, isLoading: true })
    renderPage()
    expect(screen.getByTestId("onboarding-loading")).toBeInTheDocument()
  })

  test("surfaces a request failure inline", () => {
    setup({ isError: true })
    renderPage()
    expect(screen.getByText(/That didn't work/)).toBeInTheDocument()
  })
})

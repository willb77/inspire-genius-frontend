/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import JoinPage from "../JoinPage"
import { formFieldFor, toPayload, JOIN_DEFAULTS, CONSENT_WORDING, JOIN_FORM_VERSION } from "../join.schema"
import { submitPublicRegistration } from "@/services/intake/publicIntake.service"
import type { PublicRegistrationPayload } from "@/types/intake"

jest.mock("@/services/intake/publicIntake.service", () => ({
  ...jest.requireActual("@/services/intake/publicIntake.service"),
  submitPublicRegistration: jest.fn(),
}))

const submit = submitPublicRegistration as jest.MockedFunction<typeof submitPublicRegistration>

function httpError(status?: number, data?: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const response =
    status === undefined ? undefined : ({ data, status, statusText: "", headers: {}, config } as AxiosResponse)
  return new AxiosError("failed", status === undefined ? "ERR_NETWORK" : "ERR_BAD_RESPONSE", config, {}, response)
}

// Rendered with NO AuthProvider and NO router: the page depends on neither.
function renderPage() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <JoinPage />
    </QueryClientProvider>,
  )
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("First name"), "Ada")
  await user.type(screen.getByLabelText("Last name"), "Example")
  await user.type(screen.getByLabelText("Email"), "ada@example.org")
  await user.selectOptions(screen.getByLabelText("Which best describes you?"), "mentor")
  await user.selectOptions(screen.getByLabelText("Are you PRISM accredited?"), "no")
  await user.selectOptions(screen.getByLabelText("Where would you use Inspires Genius?"), "individual")
  await user.type(screen.getByLabelText("State, province or region"), "Region")
  await user.type(screen.getByLabelText("Country"), "Country")
}

const submitButton = () => screen.getByRole("button", { name: /register your interest/i })

beforeEach(() => {
  submit.mockReset()
})

describe("JoinPage", () => {
  it("renders the form with no auth context", () => {
    renderPage()
    expect(screen.getByRole("heading", { level: 1, name: "Register your interest" })).toBeInTheDocument()
    expect(screen.getByRole("form", { name: "Register your interest" })).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("has a honeypot that is hidden from people and assistive tech", () => {
    const { container } = renderPage()
    const honeypot = container.querySelector<HTMLInputElement>('input[name="website"]')
    expect(honeypot).not.toBeNull()
    expect(honeypot?.tabIndex).toBe(-1)
    expect(honeypot?.getAttribute("autocomplete")).toBe("off")
    const wrapper = honeypot?.closest('[aria-hidden="true"]')
    expect(wrapper).not.toBeNull()
    expect(wrapper?.className).toMatch(/-left-\[10000px\]/)
    // Not reachable by an accessible-name query.
    expect(screen.queryByRole("textbox", { name: /leave this field empty/i })).not.toBeInTheDocument()
  })

  it("sends webinar_id null, no client_ip, and both consents with their wording", async () => {
    submit.mockResolvedValue({ status: "received" })
    const user = userEvent.setup()
    renderPage()
    await fillValid(user)
    await user.click(screen.getByLabelText(CONSENT_WORDING.mailing_list))
    await user.click(submitButton())

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    const body = submit.mock.calls[0][0] as PublicRegistrationPayload
    expect(body.webinar_id).toBeNull()
    expect("client_ip" in body).toBe(false)
    expect(body.website).toBeNull()
    expect(body.phone).toBeNull()
    expect(body.role_other).toBeNull()
    expect(body.consents).toEqual([
      { purpose: "webinar_email", granted: false, wording: CONSENT_WORDING.webinar_email, form_version: JOIN_FORM_VERSION },
      { purpose: "mailing_list", granted: true, wording: CONSENT_WORDING.mailing_list, form_version: JOIN_FORM_VERSION },
    ])
  })

  it("shows a thank-you that says nothing about whether the email was known", async () => {
    submit.mockResolvedValue({ status: "received" })
    const user = userEvent.setup()
    renderPage()
    await fillValid(user)
    await user.click(submitButton())
    const status = await screen.findByRole("status")
    expect(status).toHaveTextContent(/thank you/i)
    expect(status.textContent ?? "").not.toMatch(/already|exists|registered before/i)
  })

  it("404 shows a deliberate 'not open yet' notice, and the form comes back", async () => {
    submit.mockRejectedValue(httpError(404, { detail: "Not Found" }))
    const user = userEvent.setup()
    renderPage()
    await fillValid(user)
    await user.click(submitButton())
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Registration isn't open yet. Please check back soon.")
    expect(screen.queryByRole("form")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /back to the form/i }))
    expect(screen.getByLabelText("First name")).toHaveValue("Ada")
  })

  it("422 puts each server problem on its field; unknown fields go to the form-level alert", async () => {
    submit.mockRejectedValue(
      httpError(422, {
        detail: [
          { field: "email", message: "value is not a valid email address" },
          { field: "organisation", message: "organisation is required for a company or education context" },
          { field: "consents.0.granted", message: "Input should be a valid boolean" },
          { field: "webinar_id", message: "this session is not available" },
        ],
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await fillValid(user)
    await user.click(submitButton())

    await waitFor(() => expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true"))
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("value is not a valid email address")
    expect(screen.getByLabelText(/^Organisation/)).toHaveAccessibleDescription(
      "organisation is required for a company or education context",
    )
    expect(screen.getByText("Input should be a valid boolean")).toHaveAttribute("role", "alert")
    const formLevel = screen
      .getAllByRole("alert")
      .find((el) => el.textContent?.includes("We couldn't accept that submission"))
    expect(formLevel).toBeDefined()
    expect(within(formLevel as HTMLElement).getByText("this session is not available")).toBeInTheDocument()
  })

  it("429 says too many submissions", async () => {
    submit.mockRejectedValue(httpError(429, { detail: "Too many submissions. Try again later." }))
    const user = userEvent.setup()
    renderPage()
    await fillValid(user)
    await user.click(submitButton())
    expect(await screen.findByRole("alert")).toHaveTextContent(/too many submissions.*try again later/i)
    expect(screen.getByRole("form")).toBeInTheDocument()
  })

  it("a network failure is rendered, not swallowed", async () => {
    submit.mockRejectedValue(httpError())
    const user = userEvent.setup()
    renderPage()
    await fillValid(user)
    await user.click(submitButton())
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't reach the server/i)
  })

  it("blocks submit and explains missing fields before calling the server", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(submitButton())
    expect(await screen.findByText("First name is required")).toHaveAttribute("role", "alert")
    expect(screen.getByText("Email is required")).toBeInTheDocument()
    expect(submit).not.toHaveBeenCalled()
  })

  it("asks for the 'other' role and setting, and the organisation for a company", async () => {
    const user = userEvent.setup()
    renderPage()
    await fillValid(user)
    await user.selectOptions(screen.getByLabelText("Which best describes you?"), "other")
    await user.selectOptions(screen.getByLabelText("Where would you use Inspires Genius?"), "other")
    expect(screen.getByLabelText("Your role")).toBeInTheDocument()
    expect(screen.getByLabelText("Describe the setting")).toBeInTheDocument()
    await user.click(submitButton())
    expect(await screen.findByText("Please describe your role")).toBeInTheDocument()
    expect(screen.getByText("Please describe the setting")).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText("Where would you use Inspires Genius?"), "company")
    await user.type(screen.getByLabelText("Your role"), "Coach")
    await user.click(submitButton())
    expect(await screen.findByText("Organisation is required for a company or education setting")).toBeInTheDocument()
    expect(submit).not.toHaveBeenCalled()
  })

  it("sends role_other, context_other and site_id only when they apply", async () => {
    submit.mockResolvedValue({ status: "received" })
    const user = userEvent.setup()
    renderPage()
    await fillValid(user)
    await user.selectOptions(screen.getByLabelText("Which best describes you?"), "other")
    await user.type(screen.getByLabelText("Your role"), "Coach")
    await user.selectOptions(screen.getByLabelText("Where would you use Inspires Genius?"), "other")
    await user.type(screen.getByLabelText("Describe the setting"), "Community")
    await user.selectOptions(screen.getByLabelText("Are you PRISM accredited?"), "yes")
    await user.type(screen.getByLabelText("PRISM site ID (optional)"), "S-1")
    await user.click(submitButton())
    await waitFor(() => expect(submit).toHaveBeenCalled())
    const body = submit.mock.calls[0][0] as PublicRegistrationPayload
    expect(body).toMatchObject({ role: "other", role_other: "Coach", context: "other", context_other: "Community", site_id: "S-1" })
  })
})

describe("join.schema helpers", () => {
  it("formFieldFor maps dotted and unknown server fields", () => {
    expect(formFieldFor("email")).toBe("email")
    expect(formFieldFor("consents.1.wording")).toBe("consents")
    expect(formFieldFor("webinar_id")).toBeNull()
    expect(formFieldFor("client_ip")).toBeNull()
    expect(formFieldFor("body")).toBeNull()
  })

  it("toPayload drops fields that do not apply and keeps a filled honeypot", () => {
    const p = toPayload({
      ...JOIN_DEFAULTS,
      first_name: " Ada ",
      last_name: "E",
      email: "a@example.org",
      role: "mentor",
      role_other: "ignored",
      prism_accredited: "no",
      site_id: "ignored",
      context: "company",
      context_other: "ignored",
      organisation: " Org ",
      region: "R",
      country: "C",
      website: "bot",
    })
    expect(p).toMatchObject({
      first_name: "Ada",
      role_other: null,
      site_id: null,
      context_other: null,
      organisation: "Org",
      website: "bot",
      webinar_id: null,
    })
    expect(Object.keys(p)).not.toContain("client_ip")
  })
})

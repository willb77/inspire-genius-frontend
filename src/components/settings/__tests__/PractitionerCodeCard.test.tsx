import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PractitionerCodeCard from "../PractitionerCodeCard"
import { codeSchema } from "../practitionerCode.schema"

type MutateOpts = { onSuccess?: (v: { practitionerName: string }) => void }
const mutate = jest.fn()
let hookError: unknown
let pending = false
jest.mock("@/hooks/user/useRedeemPractitionerCode", () => ({
  useRedeemPractitionerCode: () => ({ mutate, error: hookError, isPending: pending }),
}))

describe("PractitionerCodeCard (PC-1c)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hookError = undefined
    pending = false
  })

  it("normalises case, spaces and dashes before submitting", async () => {
    const user = userEvent.setup()
    render(<PractitionerCodeCard />)
    await user.type(screen.getByLabelText("Practitioner code"), " abc-def ghj ")
    await user.click(screen.getByRole("button", { name: "Connect" }))
    expect(mutate).toHaveBeenCalledWith("ABCDEFGHJ", expect.anything())
  })

  it("catches a malformed code before it spends an attempt", async () => {
    const user = userEvent.setup()
    render(<PractitionerCodeCard />)
    await user.type(screen.getByLabelText("Practitioner code"), "OIL-012-345")
    await user.click(screen.getByRole("button", { name: "Connect" }))
    expect(mutate).not.toHaveBeenCalled()
    expect(await screen.findByRole("alert")).toHaveTextContent("9 letters and numbers")
  })

  it("requires a code", async () => {
    const user = userEvent.setup()
    render(<PractitionerCodeCard />)
    await user.click(screen.getByRole("button", { name: "Connect" }))
    expect(mutate).not.toHaveBeenCalled()
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter the code")
  })

  it("says who the client is now connected to", async () => {
    const user = userEvent.setup()
    render(<PractitionerCodeCard />)
    await user.type(screen.getByLabelText("Practitioner code"), "ABC-DEF-GHJ")
    await user.click(screen.getByRole("button", { name: "Connect" }))
    const opts = mutate.mock.calls[0][1] as MutateOpts
    opts.onSuccess?.({ practitionerName: "Alice Able" })
    expect(await screen.findByRole("status")).toHaveTextContent("You are now connected to Alice Able.")
    expect(screen.getByLabelText("Practitioner code")).toHaveValue("")
  })

  it.each([
    [{ response: { status: 404, data: { detail: "That code was not recognised." } } }, "That code was not recognised."],
    [{ response: { status: 429, data: { detail: "Too many attempts. Please try again later." } } }, "Too many attempts"],
    [
      { response: { status: 422, data: { detail: [{ row: null, field: "code", message: "you cannot be your own client" }] } } },
      "code: you cannot be your own client",
    ],
    [{ message: "Network Error" }, "That code could not be used"],
  ])("renders every refusal as text, never a raw object", (err, text) => {
    hookError = err
    render(<PractitionerCodeCard />)
    expect(screen.getByRole("alert")).toHaveTextContent(text)
  })

  it("disables Connect while a redeem is in flight", () => {
    pending = true
    render(<PractitionerCodeCard />)
    expect(screen.getByRole("button", { name: "Connect" })).toBeDisabled()
  })

  it("schema mirrors the server's alphabet and length", () => {
    expect(codeSchema.safeParse({ code: "abc-def-ghj" }).success).toBe(true)
    expect(codeSchema.safeParse({ code: "ABCDEFGH" }).success).toBe(false)
    expect(codeSchema.safeParse({ code: "ABCDEFGHJK" }).success).toBe(false)
    for (const bad of ["0", "O", "1", "I", "L", "U"]) {
      expect(codeSchema.safeParse({ code: bad + "BCDEFGHJ" }).success).toBe(false)
    }
  })
})

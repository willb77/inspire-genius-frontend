/**
 * @jest-environment jsdom
 *
 * Write-control wiring: the button opens the dialog, and submitting invokes the
 * matching mutation with the mapped typed body. The mutation hooks are mocked so
 * this test stays focused on the value-mapping + open/close behaviour.
 */
import { render, screen, fireEvent } from "@testing-library/react"

const mutate = jest.fn()
jest.mock("@/hooks/credits/useCreditsMutations", () => ({
  usePurchaseCredits: () => ({ mutate, isPending: false }),
  useAllocateCredits: () => ({ mutate, isPending: false }),
  useUseCredits: () => ({ mutate, isPending: false }),
}))

import {
  DistributorAllocateControl,
  DistributorPurchaseControl,
  PractitionerUseControl,
} from "../CreditsWriteControls"

beforeEach(() => mutate.mockReset())

test("purchase control maps amount + order_ref into the purchase body", () => {
  render(<DistributorPurchaseControl />)
  fireEvent.click(screen.getByRole("button", { name: "Purchase Credits" }))
  fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: "500" } })
  fireEvent.change(screen.getByLabelText(/Order reference/), { target: { value: "PO-9" } })
  fireEvent.click(screen.getByRole("button", { name: "Purchase" }))
  expect(mutate).toHaveBeenCalledWith(
    { amount: 500, order_ref: "PO-9" },
    expect.objectContaining({ onSuccess: expect.any(Function) }),
  )
})

test("allocate control maps practitioner_id + amount", () => {
  render(<DistributorAllocateControl />)
  fireEvent.click(screen.getByRole("button", { name: "Allocate Credits" }))
  fireEvent.change(screen.getByLabelText(/Practitioner ID/), { target: { value: "p-1" } })
  fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: "100" } })
  fireEvent.click(screen.getByRole("button", { name: "Allocate" }))
  expect(mutate).toHaveBeenCalledWith(
    { practitioner_id: "p-1", amount: 100 },
    expect.objectContaining({ onSuccess: expect.any(Function) }),
  )
})

test("use control maps amount and omits blank optional fields", () => {
  render(<PractitionerUseControl />)
  fireEvent.click(screen.getByRole("button", { name: "Use Credit" }))
  fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: "1" } })
  // Two buttons named "Use Credit" now exist (trigger + dialog submit); click the submit one.
  const submit = screen
    .getAllByRole("button", { name: "Use Credit" })
    .find((b) => (b as HTMLButtonElement).type === "submit")
  fireEvent.click(submit!)
  expect(mutate).toHaveBeenCalledWith(
    { amount: 1, client_id: undefined, session_ref: undefined },
    expect.objectContaining({ onSuccess: expect.any(Function) }),
  )
})

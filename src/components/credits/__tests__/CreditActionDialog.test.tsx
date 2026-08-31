/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"
import { CreditActionDialog, type CreditField } from "../CreditActionDialog"

const AMOUNT_FIELDS: CreditField[] = [
  { name: "amount", label: "Amount", kind: "amount", required: true },
  { name: "order_ref", label: "Order reference (optional)", kind: "text" },
]

describe("CreditActionDialog", () => {
  test("renders title, description, and fields when open", () => {
    render(
      <CreditActionDialog
        open
        onOpenChange={() => {}}
        title="Purchase Credits"
        description="Add credits to your pool."
        submitLabel="Purchase"
        fields={AMOUNT_FIELDS}
        isPending={false}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByRole("heading", { name: "Purchase Credits" })).toBeInTheDocument()
    expect(screen.getByText("Add credits to your pool.")).toBeInTheDocument()
    expect(screen.getByLabelText(/Amount/)).toBeInTheDocument()
  })

  test("submit is disabled until a valid positive amount is entered", () => {
    render(
      <CreditActionDialog
        open
        onOpenChange={() => {}}
        title="Purchase Credits"
        submitLabel="Purchase"
        fields={AMOUNT_FIELDS}
        isPending={false}
        onSubmit={() => {}}
      />,
    )
    const submit = screen.getByRole("button", { name: "Purchase" })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: "0" } })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: "500" } })
    expect(submit).toBeEnabled()
  })

  test("submitting calls onSubmit with the entered values", () => {
    const onSubmit = jest.fn()
    render(
      <CreditActionDialog
        open
        onOpenChange={() => {}}
        title="Purchase Credits"
        submitLabel="Purchase"
        fields={AMOUNT_FIELDS}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: "500" } })
    fireEvent.change(screen.getByLabelText(/Order reference/), { target: { value: "PO-1" } })
    fireEvent.click(screen.getByRole("button", { name: "Purchase" }))
    expect(onSubmit).toHaveBeenCalledWith({ amount: "500", order_ref: "PO-1" })
  })

  test("required text field must be non-empty to enable submit", () => {
    const fields: CreditField[] = [
      { name: "practitioner_id", label: "Practitioner ID", kind: "text", required: true },
      { name: "amount", label: "Amount", kind: "amount", required: true },
    ]
    render(
      <CreditActionDialog
        open
        onOpenChange={() => {}}
        title="Allocate"
        submitLabel="Allocate"
        fields={fields}
        isPending={false}
        onSubmit={() => {}}
      />,
    )
    const submit = screen.getByRole("button", { name: "Allocate" })
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: "100" } })
    expect(submit).toBeDisabled() // practitioner_id still empty
    fireEvent.change(screen.getByLabelText(/Practitioner ID/), { target: { value: "p-1" } })
    expect(submit).toBeEnabled()
  })

  test("pending state disables submit and cancel closes via onOpenChange", () => {
    const onOpenChange = jest.fn()
    render(
      <CreditActionDialog
        open
        onOpenChange={onOpenChange}
        title="Purchase Credits"
        submitLabel="Purchase"
        fields={AMOUNT_FIELDS}
        isPending
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByRole("button", { name: "Purchase" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

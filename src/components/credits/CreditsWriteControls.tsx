import { useState } from "react"
import { CreditActionDialog, type CreditActionValues } from "./CreditActionDialog"
import {
  useAllocateCredits,
  usePurchaseCredits,
  useUseCredits,
} from "@/hooks/credits/useCreditsMutations"

/**
 * Build-time flag. When `false` (the default, and notably on staging-b where the
 * CI build does NOT set it) the write controls below are not rendered and the
 * Credits pages keep their original static buttons — no behaviour change. When
 * `true` (dev build) the controls call the real Phase 6.5 credit endpoints.
 *
 * Read from `import.meta.env` at module load; jest rewrites this to `process.env`
 * (see jest.vite-env-transform), matching the VITE_COACH_BACKEND pattern.
 */
export const CREDITS_WRITE = import.meta.env.VITE_CREDITS_WRITE === "true"

const PRIMARY_BTN =
  "bg-[#3B5BFF] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#2A47CC] transition-colors shrink-0"

const SECONDARY_BTN =
  "border border-[#3B5BFF] text-[#3B5BFF] text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#EEF2FF] transition-colors shrink-0"

/** Distributor "Purchase Credits" — opens a dialog that posts to the purchase endpoint. */
export function DistributorPurchaseControl({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const mutation = usePurchaseCredits()

  function submit(v: CreditActionValues) {
    mutation.mutate(
      { amount: Number(v.amount), order_ref: v.order_ref?.trim() || undefined },
      { onSuccess: () => setOpen(false) },
    )
  }

  return (
    <>
      <button type="button" className={className ?? PRIMARY_BTN} onClick={() => setOpen(true)}>
        Purchase Credits
      </button>
      <CreditActionDialog
        open={open}
        onOpenChange={setOpen}
        title="Purchase Credits"
        description="Add PRISM assessment credits to your available pool."
        submitLabel="Purchase"
        isPending={mutation.isPending}
        onSubmit={submit}
        fields={[
          { name: "amount", label: "Amount", kind: "amount", required: true, placeholder: "e.g. 500" },
          { name: "order_ref", label: "Order reference (optional)", kind: "text", placeholder: "PO / invoice #" },
        ]}
      />
    </>
  )
}

/** Distributor "Allocate to Practitioner" — posts to the allocate endpoint. */
export function DistributorAllocateControl({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const mutation = useAllocateCredits()

  function submit(v: CreditActionValues) {
    mutation.mutate(
      { practitioner_id: v.practitioner_id.trim(), amount: Number(v.amount) },
      { onSuccess: () => setOpen(false) },
    )
  }

  return (
    <>
      <button type="button" className={className ?? SECONDARY_BTN} onClick={() => setOpen(true)}>
        Allocate Credits
      </button>
      <CreditActionDialog
        open={open}
        onOpenChange={setOpen}
        title="Allocate Credits"
        description="Move credits from your pool to one of your practitioners."
        submitLabel="Allocate"
        isPending={mutation.isPending}
        onSubmit={submit}
        fields={[
          { name: "practitioner_id", label: "Practitioner ID", kind: "text", required: true, placeholder: "practitioner UUID" },
          { name: "amount", label: "Amount", kind: "amount", required: true, placeholder: "e.g. 100" },
        ]}
      />
    </>
  )
}

/** Practitioner "Use Credit" — posts to the use endpoint. */
export function PractitionerUseControl({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const mutation = useUseCredits()

  function submit(v: CreditActionValues) {
    mutation.mutate(
      {
        amount: Number(v.amount),
        client_id: v.client_id?.trim() || undefined,
        session_ref: v.session_ref?.trim() || undefined,
      },
      { onSuccess: () => setOpen(false) },
    )
  }

  return (
    <>
      <button type="button" className={className ?? PRIMARY_BTN} onClick={() => setOpen(true)}>
        Use Credit
      </button>
      <CreditActionDialog
        open={open}
        onOpenChange={setOpen}
        title="Use a Credit"
        description="Record a PRISM assessment credit used for a client session."
        submitLabel="Use Credit"
        isPending={mutation.isPending}
        onSubmit={submit}
        fields={[
          { name: "amount", label: "Amount", kind: "amount", required: true, placeholder: "e.g. 1" },
          { name: "client_id", label: "Client ID (optional)", kind: "text", placeholder: "client UUID" },
          { name: "session_ref", label: "Session reference (optional)", kind: "text", placeholder: "session note" },
        ]}
      />
    </>
  )
}

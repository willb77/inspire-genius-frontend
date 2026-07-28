import { useState } from "react"
import { ClipboardList, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { useRequestPrismReport } from "@/hooks/honor/useHonorEvaluate"
import { HONOR_BTN_OUTLINE, HONOR_BTN_PRIMARY } from "./_format"

/**
 * "Request a PRISM report" modal — collects a person's first name, last name,
 * and email and requests a PRISM survey for them. Role is fixed to "user" and
 * organization to "The Honor Foundation" (shown read-only; enforced server-side).
 */
export default function RequestPrismModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const request = useRequestPrismReport()

  if (!open) return null

  function reset() {
    setFirstName("")
    setLastName("")
    setEmail("")
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.warning("First name, last name, and email are all required.")
      return
    }
    request.mutate(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
      },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
      },
    )
  }

  const inputCls =
    "w-full rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"
  const fixedCls =
    "w-full rounded-lg border border-[#dfe4ec] bg-[#f2f4f8] px-3 py-2 text-sm text-[#5b6678]"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-[#18202f]">
            <ClipboardList className="h-4 w-4 text-[#1B2A4A]" /> Request a PRISM report
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9299a6] hover:text-[#18202f]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-sm text-[#5b6678]">
          Provisions the person as a platform user and sends them a PRISM survey.
        </p>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-[#374151]">
              First name <span className="text-[#c0392b]">*</span>
            </span>
            <input
              className={inputCls}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jane"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-[#374151]">
              Last name <span className="text-[#c0392b]">*</span>
            </span>
            <input
              className={inputCls}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-[#374151]">
              Email <span className="text-[#c0392b]">*</span>
            </span>
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane.doe@email.com"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-[#374151]">Role</span>
            <input className={fixedCls} value="user" readOnly disabled aria-label="Role" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-[#374151]">Organization</span>
            <input
              className={fixedCls}
              value="The Honor Foundation"
              readOnly
              disabled
              aria-label="Organization"
            />
          </label>
          <div className="mt-1 flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose} className={HONOR_BTN_OUTLINE}>
              Cancel
            </button>
            <button type="submit" disabled={request.isPending} className={HONOR_BTN_PRIMARY}>
              {request.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardList className="h-4 w-4" />
              )}
              Request report
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

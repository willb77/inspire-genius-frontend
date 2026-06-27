import { useMutation } from '@tanstack/react-query'
import { checkExistingCustomer } from '@/services/prism/prism.service'
import { toast } from 'sonner'

/** Stable mutation key for the "check existing customer" lookup. */
export const checkCustomerKey = ['prism', 'check-customer'] as const

interface CheckExistingCustomerParams {
  email?: string
  externalIdent?: string
  questionnaireTypeId: number
  forename?: string
  surname?: string
}

/**
 * Mutation: `POST /v1/prism/check-customer` — look up whether a PRISM
 * customer already exists for the given email / external ident.
 *
 * No toast on success (the result is rendered inline by the caller);
 * toast on error only.
 */
export function useCheckExistingCustomer() {
  return useMutation({
    mutationKey: checkCustomerKey,
    mutationFn: (params: CheckExistingCustomerParams) =>
      checkExistingCustomer(params),
    onError: () => {
      toast.error('Could not check for an existing PRISM customer. Please try again.')
    },
  })
}

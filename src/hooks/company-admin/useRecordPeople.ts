import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { bulkImportUsers } from "@/services/bulk-import"
import type { BulkImportResponse, BulkUserRecord } from "@/types/bulk-import"

/**
 * House-style "Add people" (company admin): record people in the organization.
 *
 * Same service call as the classic import page (`bulkImportUsers`), with no new
 * endpoint. It differs from `useBulkImport` only in what it says: it raises no
 * toast, because that hook's "users created" toast reads as if the people can
 * now sign in, and from a company-admin import they cannot yet. The Add people
 * panel shows the honest outcome itself. Refreshes the People list on success.
 */
export function useRecordPeople() {
  const queryClient = useQueryClient()
  return useMutation<BulkImportResponse, AxiosError, BulkUserRecord[]>({
    mutationFn: bulkImportUsers,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company-users"] })
    },
  })
}

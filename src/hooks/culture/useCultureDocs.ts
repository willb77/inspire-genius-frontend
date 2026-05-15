/**
 * React Query hooks for culture document management.
 *
 * Follows the Service → Hook → Component pattern.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  listCultureDocs,
  uploadCultureDoc,
  deleteCultureDoc,
  type CultureDocListResponse,
  type CultureDoc,
} from "@/services/culture/cultureService"

const CULTURE_DOCS_KEY = ["culture-docs"] as const

/** Fetch all culture documents for the current org. */
export function useCultureDocs() {
  return useQuery<CultureDocListResponse>({
    queryKey: CULTURE_DOCS_KEY,
    queryFn: listCultureDocs,
  })
}

/** Upload a new culture document. Invalidates the list on success. */
export function useUploadCultureDoc() {
  const qc = useQueryClient()
  return useMutation<CultureDoc, Error, { file: File; onProgress?: (pct: number) => void }>({
    mutationFn: ({ file, onProgress }) => uploadCultureDoc(file, onProgress),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CULTURE_DOCS_KEY })
    },
  })
}

/** Delete a culture document. Invalidates the list on success. */
export function useDeleteCultureDoc() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (docId) => deleteCultureDoc(docId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CULTURE_DOCS_KEY })
    },
  })
}

/**
 * useEmployerPackCatalogue — React Query hook for the curated employer/sector packs.
 *
 * Metadata only (names, sectors, question counts) — never question text, which
 * stays server-side. Used by the frame form to show which employers and sectors
 * have a curated set, so the candidate isn't guessing at spellings.
 *
 * The service already fails open to an empty catalogue, so a dead endpoint
 * degrades to "no suggestions" rather than a broken form.
 */
import { useQuery } from "@tanstack/react-query"

import {
  getEmployerPackCatalogue,
  type EmployerPackCatalogue,
} from "@/services/interview/practice.service"

export function useEmployerPackCatalogue(params?: { enabled?: boolean }) {
  return useQuery<EmployerPackCatalogue>({
    queryKey: ["interview", "employer-packs"],
    queryFn: getEmployerPackCatalogue,
    enabled: params?.enabled ?? true,
    // The pack dataset ships with the image — it only changes on deploy.
    staleTime: 1000 * 60 * 60,
    retry: false,
  })
}

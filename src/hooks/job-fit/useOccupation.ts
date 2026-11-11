import { useQuery } from "@tanstack/react-query"
import { getOccupation, getOccupationPay } from "@/services/job-fit/occupations.service"

export const occupationKeys = {
  detail: (code: string) => ["occupations", "detail", code] as const,
  pay: (code: string) => ["occupations", "pay", code] as const,
}

/** JF-6 — one occupation's O*NET read. Idle (no request) while `code` is null. */
export function useOccupation(code: string | null) {
  return useQuery({
    queryKey: occupationKeys.detail(code ?? ""),
    queryFn: () => getOccupation(code as string),
    enabled: !!code,
    staleTime: 60 * 60_000,
    retry: false,
  })
}

/**
 * JF-6 — OEWS pay for one occupation. No profile location exists to send yet,
 * so the server answers nationally and names it. Idle while `code` is null.
 */
export function useOccupationPay(code: string | null) {
  return useQuery({
    queryKey: occupationKeys.pay(code ?? ""),
    queryFn: () => getOccupationPay(code as string),
    enabled: !!code,
    staleTime: 60 * 60_000,
    retry: false,
  })
}

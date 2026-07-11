import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { lookupSalary } from "@/services/grant/salary.service"
import type { SalaryLookup } from "@/types/grant"
import { MOCK_SALARY, USE_GRANT_MOCKS } from "./mocks"

/** Occupation salary lookup (GET /v1/salary-lookup), mock-backed for UI-0. */
export function useSalary(
  occupation: string,
  options?: Partial<UseQueryOptions<SalaryLookup, AxiosError>>
) {
  return useQuery<SalaryLookup, AxiosError>({
    queryKey: ["grant", "salary", occupation],
    enabled: occupation.length > 0,
    queryFn: async () => {
      if (USE_GRANT_MOCKS) return MOCK_SALARY
      const res = await lookupSalary(occupation)
      return res.data as SalaryLookup
    },
    ...options,
  })
}

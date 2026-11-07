import { useQuery } from "@tanstack/react-query"
import { getMyPracticeRegistration } from "@/services/practitioner-practice/practitionerPractice.service"

export const myPracticeRegistrationKey = ["practitioner", "my-practice-registration"] as const

/** The signed-in practitioner's own PRISM registration (PI-2, page S3). */
export function useMyPracticeRegistration() {
  return useQuery({
    queryKey: myPracticeRegistrationKey,
    queryFn: getMyPracticeRegistration,
    staleTime: 60_000,
    retry: false,
  })
}

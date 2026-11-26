import { useQuery } from "@tanstack/react-query"
import { getPractitionerSessions, getPractitionerCredits, getPractitionerFollowups } from "@/services/practitioner/practitioner.service"

export function usePractitionerSessions() {
  return useQuery({ queryKey: ["practitioner-sessions"], queryFn: async () => { const r = await getPractitionerSessions(); return r.data?.data } })
}

export function usePractitionerCredits() {
  return useQuery({ queryKey: ["practitioner-credits"], queryFn: async () => { const r = await getPractitionerCredits(); return r.data?.data } })
}

export function usePractitionerFollowups() {
  return useQuery({ queryKey: ["practitioner-followups"], queryFn: async () => { const r = await getPractitionerFollowups(); return r.data?.data } })
}

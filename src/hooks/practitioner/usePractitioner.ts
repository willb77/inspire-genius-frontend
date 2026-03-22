import { useQuery } from "@tanstack/react-query"
import { getPractitionerClients, getPractitionerSessions, getPractitionerCredits, getPractitionerFollowups } from "@/services/practitioner/practitioner.service"

export function usePractitionerClients() {
  return useQuery({ queryKey: ["practitioner-clients"], queryFn: async () => { const r = await getPractitionerClients(); return r.data?.data } })
}

export function usePractitionerSessions() {
  return useQuery({ queryKey: ["practitioner-sessions"], queryFn: async () => { const r = await getPractitionerSessions(); return r.data?.data } })
}

export function usePractitionerCredits() {
  return useQuery({ queryKey: ["practitioner-credits"], queryFn: async () => { const r = await getPractitionerCredits(); return r.data?.data } })
}

export function usePractitionerFollowups() {
  return useQuery({ queryKey: ["practitioner-followups"], queryFn: async () => { const r = await getPractitionerFollowups(); return r.data?.data } })
}

import { useQuery } from "@tanstack/react-query"
import { getDistributorPractitioners, getDistributorCredits, getDistributorTransactions, getDistributorTerritory } from "@/services/distributor/distributor.service"

export function useDistributorPractitioners() {
  return useQuery({ queryKey: ["distributor-practitioners"], queryFn: async () => { const r = await getDistributorPractitioners(); return r.data?.data } })
}

export function useDistributorCredits() {
  return useQuery({ queryKey: ["distributor-credits"], queryFn: async () => { const r = await getDistributorCredits(); return r.data?.data } })
}

export function useDistributorTransactions() {
  return useQuery({ queryKey: ["distributor-transactions"], queryFn: async () => { const r = await getDistributorTransactions(); return r.data?.data } })
}

export function useDistributorTerritory() {
  return useQuery({ queryKey: ["distributor-territory"], queryFn: async () => { const r = await getDistributorTerritory(); return r.data?.data } })
}

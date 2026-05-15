import { useQuery } from '@tanstack/react-query'
import { getRoles } from '@/services/super-admin/roles.service'

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

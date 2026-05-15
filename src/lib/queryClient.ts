import { QueryClient } from '@tanstack/react-query'

/**
 * Global QueryClient with sensible defaults to reduce unnecessary API calls.
 * Individual queries/mutations can override these defaults as needed.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — keeps stable data (profiles, org settings) fresh without refetching
      retry: 2, // retry failed queries twice before surfacing the error
      refetchOnWindowFocus: false, // don't refetch when user tabs back
    },
  },
})

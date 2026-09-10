import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mutationErrorMessage, shouldStayQuiet } from '@/lib/mutationErrorToast'

/**
 * Global QueryClient with sensible defaults to reduce unnecessary API calls.
 * Individual queries/mutations can override these defaults as needed.
 */
export const queryClient = new QueryClient({
  /**
   * Every mutation that rejects without its own `onError` surfaces here.
   *
   * Added 2026-09-08. Before it, a failed write was indistinguishable from a
   * successful one on ~400 of the app's 469 mutation call sites: the spinner
   * stopped, the button came back, and nothing was said. See
   * `mutationErrorToast.ts` for the two failures that prompted it.
   *
   * This is a NET, not a substitute for handling errors where the hook can say
   * something more useful — a hook that defines `onError` keeps full control and
   * this stays silent. Opt a background write out with
   * `meta: { quietError: true }`.
   */
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (shouldStayQuiet(error, mutation)) return
      toast.error(mutationErrorMessage(error))
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — keeps stable data (profiles, org settings) fresh without refetching
      retry: 2, // retry failed queries twice before surfacing the error
      refetchOnWindowFocus: false, // don't refetch when user tabs back
    },
  },
})

import fs from "fs"
import path from "path"
import { MutationCache, QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  FALLBACK_MESSAGE,
  mutationErrorMessage,
  shouldStayQuiet,
} from "@/lib/mutationErrorToast"

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }))

const axiosError = (status: number, data?: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data },
  })

/** Minimal stand-in for the `mutation` argument the cache hands the callback. */
const withOptions = (options: Record<string, unknown>) =>
  ({ options }) as unknown as Parameters<typeof shouldStayQuiet>[1]

describe("shouldStayQuiet", () => {
  it("stays quiet when the mutation defines its own onError", () => {
    // 59 files already toast their own message; a second one would contradict them.
    expect(shouldStayQuiet(axiosError(500), withOptions({ onError: () => {} }))).toBe(true)
  })

  it("stays quiet on 401 even when opted in — the interceptor owns refresh/logout", () => {
    // Session expiry 401s every in-flight request at once. Toasting here stacks
    // a pile of identical errors over the login redirect.
    expect(shouldStayQuiet(axiosError(401), withOptions({ meta: { surfaceError: true } }))).toBe(true)
  })

  it("stays quiet when a background write opts out via meta.quietError", () => {
    expect(shouldStayQuiet(axiosError(500),
      withOptions({ meta: { quietError: true, surfaceError: true } }))).toBe(true)
  })

  it("stays quiet by DEFAULT — a hook must opt in", () => {
    // The inversion. 77 catch blocks across 36 files already toast their own
    // message after awaiting mutateAsync, and React Query cannot tell the cache
    // callback whether the caller caught. Silent-by-default is what keeps this
    // change from doubling those.
    expect(shouldStayQuiet(axiosError(500), withOptions({}))).toBe(true)
  })

  it("SPEAKS UP for an opted-in, unhandled, non-401 failure", () => {
    // The whole point. If this flips to true the net is decorative — which is
    // indistinguishable, from the suite's perspective, from not having shipped it.
    const optedIn = { meta: { surfaceError: true } }
    expect(shouldStayQuiet(axiosError(500), withOptions(optedIn))).toBe(false)
    expect(shouldStayQuiet(axiosError(403), withOptions(optedIn))).toBe(false)
    expect(shouldStayQuiet(new Error("Network Error"), withOptions(optedIn))).toBe(false)
  })

  it("an explicit onError still wins over an explicit opt-in", () => {
    // Order matters: a hook that later gains an `onError` must not start
    // doubling just because someone left the opt-in behind.
    expect(shouldStayQuiet(axiosError(500),
      withOptions({ meta: { surfaceError: true }, onError: () => {} }))).toBe(true)
  })
})

describe("mutationErrorMessage", () => {
  it("never returns an object for a FastAPI 422 detail list", () => {
    // Passing this array to sonner rendered it as a React child and took the
    // page down with React error #31. Every branch must return a string.
    const err = axiosError(422, {
      detail: [{ type: "string_type", loc: ["body", "evidence", "sd_score"], msg: "Input should be a valid string" }],
    })
    const msg = mutationErrorMessage(err)
    expect(typeof msg).toBe("string")
    expect(msg).toContain("evidence.sd_score")
  })

  it("prefers the service's own {message} envelope", () => {
    expect(mutationErrorMessage(axiosError(409, { message: "You already have a profile named 'Sonny'." })))
      .toBe("You already have a profile named 'Sonny'.")
  })

  it("replaces axios boilerplate with something a human can act on", () => {
    // apiErrorMessage returns err.message before its own fallback, and for an
    // axios error that is "Request failed with status code 500".
    expect(mutationErrorMessage(axiosError(500))).toBe(FALLBACK_MESSAGE)
  })

  it("keeps a real server detail string", () => {
    expect(mutationErrorMessage(axiosError(400, { detail: "Member is not on your roster." })))
      .toBe("Member is not on your roster.")
  })
})

describe("the SHIPPED client, not a reconstruction", () => {
  // The block below rebuilds the cache, which proves the logic but would still
  // pass if `queryClient.ts` never wired it up. This one imports the real
  // client the app provides in App.tsx, so a missing `mutationCache` key fails
  // here — which is the only thing that would actually reach users.
  beforeEach(() => (toast.error as jest.Mock).mockClear())

  it("surfaces an unhandled failure through the app's own queryClient", async () => {
    const { queryClient } = await import("@/lib/queryClient")
    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationFn: async () => {
          throw axiosError(500, { detail: "Dossier recompute failed." })
        },
        retry: false,
        meta: { surfaceError: true },
      })
      .execute(undefined)
      .catch(() => {})
    expect(toast.error).toHaveBeenCalledWith("Dossier recompute failed.")
  })
})

describe("the wiring, not just the helpers", () => {
  const run = async (options: Record<string, unknown>, error: unknown) => {
    const client = new QueryClient({
      mutationCache: new MutationCache({
        onError: (e, _v, _c, mutation) => {
          if (shouldStayQuiet(e, mutation)) return
          toast.error(mutationErrorMessage(e))
        },
      }),
    })
    await client
      .getMutationCache()
      .build(client, {
        mutationFn: async () => { throw error },
        retry: false,
        meta: { surfaceError: true },
        ...options,
      })
      .execute(undefined)
      .catch(() => {})
  }

  beforeEach(() => (toast.error as jest.Mock).mockClear())

  it("toasts once for an unhandled failed mutation", async () => {
    await run({}, axiosError(500, { detail: "Roster write failed." }))
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith("Roster write failed.")
  })

  it("does not toast when the mutation handles its own error", async () => {
    await run({ onError: () => {} }, axiosError(500))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("does not toast on 401", async () => {
    await run({}, axiosError(401))
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe("the double-toast this inversion exists to prevent", () => {
  beforeEach(() => (toast.error as jest.Mock).mockClear())

  it("a caller that catches mutateAsync and toasts gets exactly ONE toast", async () => {
    // Measured before the inversion: 2 toasts, BOTH reading "Could not save
    // that rating" — one from the surface, one generic — so a single failure
    // read as two. 77 catch blocks across 36 files have this shape.
    const client = new QueryClient({
      mutationCache: new MutationCache({
        onError: (e, _v, _c, m) => {
          if (shouldStayQuiet(e, m)) return
          toast.error(mutationErrorMessage(e))
        },
      }),
    })
    const mutation = client.getMutationCache().build(client, {
      mutationFn: async () => {
        throw axiosError(500, { detail: "Could not save that rating" })
      },
      retry: false,
    })
    try {
      await mutation.execute(undefined)
    } catch {
      toast.error("Could not save that rating")
    }
    expect(toast.error).toHaveBeenCalledTimes(1)
  })
})

describe("the hooks that prompted this stay opted in", () => {
  // Static, deliberately. The opt-in lives in `useMutation` options and is only
  // observable at runtime through a rendered hook — so a behavioural test would
  // only cover the paths it happens to exercise, and dropping `meta` from any of
  // these would otherwise pass every suite in the repo. These four are the ones
  // whose silence cost real time on 2026-09-08.
  const H = path.join(__dirname, "..", "..", "hooks", "manager", "development")

  it.each([
    ["useMemberDossier.ts", "useRefreshDossier"],
    ["useGoalSession.ts", "useGoalSession"],
    ["useLearningPlan.ts", "useLearningPlan"],
    ["useMilestones.ts", "useCreateMilestone"],
  ])("%s → %s declares meta.surfaceError", (file, fn) => {
    const src = fs.readFileSync(path.join(H, file), "utf8")
    const from = src.indexOf(`export function ${fn}(`)
    expect(from).toBeGreaterThan(-1)
    const next = src.indexOf("\nexport function ", from + 1)
    const body = src.slice(from, next === -1 ? undefined : next)
    expect(body).toContain("surfaceError: true")
  })
})

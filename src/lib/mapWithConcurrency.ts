/**
 * Run `items` through `fn`, at most `limit` at a time, preserving order.
 *
 * Exists because unbounded `Promise.all` fan-out can defeat a per-request
 * timeout. The Character Lab's seven analysis parts each take 7-17 seconds
 * alone; fired all at once against the agent-engine they contend, and the last
 * one waits long enough to exceed API Gateway's 30s integration cap. Measured
 * on dev with a full 88-score profile:
 *
 *     concurrency 7 -> 1 of 7 failed, slowest 30.2s
 *     concurrency 3 -> 0 of 7 failed, slowest 22.9s
 *     concurrency 2 -> 0 of 7 failed, slowest 24.7s
 *
 * Queueing server-side would not help: the gateway's clock starts when the
 * request ARRIVES, so a request waiting for a worker is already burning it.
 * The pacing has to happen before the request is sent.
 *
 * Results come back in input order, and a rejection is captured rather than
 * thrown so one failure cannot cancel the rest — same contract as
 * `Promise.allSettled`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length)
  let next = 0

  async function worker(): Promise<void> {
    for (;;) {
      const index = next++
      if (index >= items.length) return
      try {
        results[index] = { status: "fulfilled", value: await fn(items[index], index) }
      } catch (reason) {
        results[index] = { status: "rejected", reason }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker),
  )
  return results
}

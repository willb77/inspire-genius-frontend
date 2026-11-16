/** Read at call time (not module load) so a build-time value and a test can both set it. */
export function getTurnstileSiteKey(): string {
  return (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? ""
}

/**
 * Helpers for environment-gated behaviour.
 *
 * `VITE_SKIP_ONBOARDING=true` removes the post-auth `/onboarding/*` redirect
 * in dev + staging-b — users provisioned via the admin-tools stop-gap arrive
 * fully ready and shouldn't be bounced through the wizard. Default `false`
 * preserves the wizard on production builds and any env that doesn't opt in.
 *
 * `VITE_SENTRY_ENVIRONMENT` is the canonical deploy-env discriminator
 * (already set per-env in `.env.staging-b` and CI). We export a read of it
 * so other parts of the app can branch on env if needed.
 */
export function getDeployEnv(): "development" | "staging" | "staging-b" | "production" | "unknown" {
  const raw = (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ?? "";
  const v = raw.toLowerCase().trim();
  if (v === "development" || v === "dev") return "development";
  if (v === "staging") return "staging";
  if (v === "staging-b" || v === "stagingb") return "staging-b";
  if (v === "production" || v === "prod") return "production";
  return "unknown";
}

export function shouldSkipOnboarding(): boolean {
  // Explicit env flag wins.
  const flag = (import.meta.env.VITE_SKIP_ONBOARDING as string | undefined) ?? "";
  if (flag.toLowerCase() === "true") return true;
  if (flag.toLowerCase() === "false") return false;
  // Implicit: dev + staging-b skip onboarding by default. Production keeps
  // the wizard. (Per Bill 2026-06-19: admin-provisioned users in dev +
  // staging-b are fully ready on first login.)
  const env = getDeployEnv();
  return env === "development" || env === "staging-b";
}

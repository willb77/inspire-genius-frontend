import { getDeployEnv, shouldSkipOnboarding } from "@/lib/deployEnv";

const ENV = import.meta.env as unknown as Record<string, string | undefined>;

describe("deployEnv", () => {
  let originalSentryEnv: string | undefined;
  let originalSkipFlag: string | undefined;

  beforeEach(() => {
    originalSentryEnv = ENV.VITE_SENTRY_ENVIRONMENT;
    originalSkipFlag = ENV.VITE_SKIP_ONBOARDING;
  });

  afterEach(() => {
    ENV.VITE_SENTRY_ENVIRONMENT = originalSentryEnv;
    ENV.VITE_SKIP_ONBOARDING = originalSkipFlag;
  });

  it("maps VITE_SENTRY_ENVIRONMENT to deploy env", () => {
    ENV.VITE_SENTRY_ENVIRONMENT = "development";
    expect(getDeployEnv()).toBe("development");

    ENV.VITE_SENTRY_ENVIRONMENT = "staging-b";
    expect(getDeployEnv()).toBe("staging-b");

    ENV.VITE_SENTRY_ENVIRONMENT = "production";
    expect(getDeployEnv()).toBe("production");

    ENV.VITE_SENTRY_ENVIRONMENT = "";
    expect(getDeployEnv()).toBe("unknown");
  });

  it("explicit VITE_SKIP_ONBOARDING=true wins", () => {
    ENV.VITE_SKIP_ONBOARDING = "true";
    ENV.VITE_SENTRY_ENVIRONMENT = "production";
    expect(shouldSkipOnboarding()).toBe(true);
  });

  it("explicit VITE_SKIP_ONBOARDING=false wins", () => {
    ENV.VITE_SKIP_ONBOARDING = "false";
    ENV.VITE_SENTRY_ENVIRONMENT = "development";
    expect(shouldSkipOnboarding()).toBe(false);
  });

  it("implicit skip in development", () => {
    ENV.VITE_SKIP_ONBOARDING = "";
    ENV.VITE_SENTRY_ENVIRONMENT = "development";
    expect(shouldSkipOnboarding()).toBe(true);
  });

  it("implicit skip in staging-b", () => {
    ENV.VITE_SKIP_ONBOARDING = "";
    ENV.VITE_SENTRY_ENVIRONMENT = "staging-b";
    expect(shouldSkipOnboarding()).toBe(true);
  });

  it("implicit NO-skip in production", () => {
    ENV.VITE_SKIP_ONBOARDING = "";
    ENV.VITE_SENTRY_ENVIRONMENT = "production";
    expect(shouldSkipOnboarding()).toBe(false);
  });

  it("implicit NO-skip in staging", () => {
    ENV.VITE_SKIP_ONBOARDING = "";
    ENV.VITE_SENTRY_ENVIRONMENT = "staging";
    expect(shouldSkipOnboarding()).toBe(false);
  });
});

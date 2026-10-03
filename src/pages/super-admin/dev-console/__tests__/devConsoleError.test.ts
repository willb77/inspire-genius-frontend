import { describeDevConsoleError, parseDevConsoleError } from "@/pages/super-admin/dev-console/devConsoleError";
import { translateDevConsole as t } from "@/test/devConsoleI18nMock";
import { ME, apiError, networkError } from "@/test/devConsoleFixtures";

describe("describeDevConsoleError — the contract's 'The panel shows' column", () => {
  it.each([
    [403, "OWNER_ONLY", "Only the owner can manage access."],
    [404, "NOT_FOUND", "Not found."],
    [409, "NOT_AWAITING_CONTINUE", "This job is not paused at the step cap, so there is nothing to continue."],
    [422, "PROMPT_CONTAINS_SECRET", "Your prompt looks like it contains a key or token. Remove it and resend."],
    [429, "BUSY", "One job at a time."],
    [429, "BUDGET_EXCEEDED", "Today's budget is used ($0.42 of $5.00)."],
    [503, "CONSOLE_DISABLED", "The console is switched off."],
  ])("%s %s → %s", (status, code, text) => {
    expect(describeDevConsoleError(apiError(status, code), t, ME)).toEqual({ kind: "message", code, text });
  });

  it("VALIDATION shows the field error from description", () => {
    expect(describeDevConsoleError(apiError(422, "VALIDATION", "repo: not on the list"), t, ME)).toEqual({
      kind: "message",
      code: "VALIDATION",
      text: "repo: not on the list",
    });
    expect(describeDevConsoleError(apiError(422, "VALIDATION"), t, ME)).toMatchObject({
      text: "Check the request and try again.",
    });
  });

  it("BUDGET_EXCEEDED without /me still says the budget is used", () => {
    expect(describeDevConsoleError(apiError(429, "BUDGET_EXCEEDED"), t, null)).toMatchObject({
      text: "Today's budget is used.",
    });
  });

  it("the two access 403s hide rather than alert", () => {
    expect(describeDevConsoleError(apiError(403, "NOT_SUPER_ADMIN"), t)).toEqual({ kind: "hidden", code: "NOT_SUPER_ADMIN" });
    expect(describeDevConsoleError(apiError(403, "DEV_CONSOLE_FORBIDDEN"), t)).toEqual({
      kind: "hidden",
      code: "DEV_CONSOLE_FORBIDDEN",
    });
  });

  it("401 renders nothing — the interceptor is redirecting to sign-in", () => {
    expect(describeDevConsoleError(apiError(401, "UNAUTHENTICATED"), t)).toEqual({ kind: "none" });
    expect(describeDevConsoleError(apiError(401), t)).toEqual({ kind: "none" });
  });

  it("a network failure, an unknown code and a plain Error are all still shown", () => {
    expect(describeDevConsoleError(networkError(), t)).toMatchObject({ kind: "message", code: "NETWORK" });
    expect(describeDevConsoleError(apiError(500, "SOMETHING_NEW"), t)).toMatchObject({
      kind: "message",
      text: "The console returned an error (SOMETHING_NEW).",
    });
    expect(describeDevConsoleError(apiError(502), t)).toMatchObject({
      kind: "message",
      text: "The console returned an error (HTTP 502).",
    });
    expect(describeDevConsoleError(new Error("no job id"), t)).toMatchObject({
      kind: "message",
      text: "Something went wrong: no job id",
    });
  });

  it("parses non-axios values without throwing", () => {
    expect(parseDevConsoleError(undefined)).toEqual({ network: false, message: "" });
    expect(parseDevConsoleError("x")).toEqual({ network: false, message: "x" });
  });
});

/**
 * The one password rule, used by every page that sets a password
 * (sign up, accept invitation, reset, change).
 *
 * It mirrors the server, which is the authority: the Cognito pool on dev and
 * staging-b requires at least 8 characters with an upper-case letter, a
 * lower-case letter and a number, and does NOT require a symbol
 * (`infrastructure/cdk/lib/cognito-stack.ts` passwordPolicy; auth-service's
 * reset / change / accept-invitation schemas also enforce min_length=8).
 * If the pool policy changes, change it here — and only here.
 */

export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_RULE_TEXT =
  "At least 8 characters, with a capital, a small letter and a number."

export type PasswordCheck = { key: "length" | "upper" | "lower" | "number"; label: string; met: boolean }

/** Each part of the rule, in display order, with whether `password` meets it. */
export function checkPassword(password: string): PasswordCheck[] {
  return [
    { key: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: password.length >= PASSWORD_MIN_LENGTH },
    { key: "upper", label: "A capital letter", met: /[A-Z]/.test(password) },
    { key: "lower", label: "A small letter", met: /[a-z]/.test(password) },
    { key: "number", label: "A number", met: /\d/.test(password) },
  ]
}

/** True when `password` meets every part of the rule. */
export function passwordMeetsRule(password: string): boolean {
  return checkPassword(password).every((c) => c.met)
}

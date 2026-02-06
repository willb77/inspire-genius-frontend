/**
 * Shared email-validation helper used by form-rule objects.
 *
 * Bounded, simple email check to avoid catastrophic backtracking:
 *   local-part up to 64 chars, domain host up to 253 chars, TLD 2+ alpha chars.
 *
 * Returns `true` when valid, or the provided error message string when invalid.
 */

const LOCAL_ALLOWED = new Set([".", "_", "%", "+", "-"]);
const HOST_ALLOWED = new Set([".", "-"]);

function isAlpha(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isAlphaNumeric(code: number): boolean {
  return isAlpha(code) || (code >= 48 && code <= 57);
}

function isValidLocal(local: string): boolean {
  if (local.length < 1 || local.length > 64) return false;
  for (let i = 0; i < local.length; i += 1) {
    const ch = local[i] ?? "";
    if (!isAlphaNumeric(ch.charCodeAt(0)) && !LOCAL_ALLOWED.has(ch)) return false;
  }
  return true;
}

function isValidHost(host: string): boolean {
  if (host.length < 1 || host.length > 253) return false;
  for (let i = 0; i < host.length; i += 1) {
    const ch = host[i] ?? "";
    if (!isAlphaNumeric(ch.charCodeAt(0)) && !HOST_ALLOWED.has(ch)) return false;
  }
  return true;
}

function isValidTld(tld: string): boolean {
  if (tld.length < 2) return false;
  for (let i = 0; i < tld.length; i += 1) {
    if (!isAlpha((tld[i] ?? "").charCodeAt(0))) return false;
  }
  return true;
}

export function validateEmail(
  value: string,
  msg = "Enter a valid email",
): true | string {
  if (!value) return true;

  const atIndex = value.indexOf("@");
  if (atIndex <= 0) return msg;
  if (value.indexOf("@", atIndex + 1) !== -1) return msg;

  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);
  if (!local || !domain) return msg;

  if (!isValidLocal(local)) return msg;

  const lastDot = domain.lastIndexOf(".");
  if (lastDot <= 0 || lastDot >= domain.length - 1) return msg;

  const host = domain.slice(0, lastDot);
  const tld = domain.slice(lastDot + 1);

  if (!isValidHost(host)) return msg;
  if (!isValidTld(tld)) return msg;

  return true;
}

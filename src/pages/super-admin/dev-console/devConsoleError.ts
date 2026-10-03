import type { AxiosError } from "axios";

import type { BaseApiResponse } from "@/types/api";
import type { DevConsoleMe } from "@/types/devConsole";

/**
 * How a console failure is shown — the contract's "The panel shows" column.
 *
 * - `none`    — 401: the shared interceptor has already sent the user to sign in.
 * - `hidden`  — 403 NOT_SUPER_ADMIN / DEV_CONSOLE_FORBIDDEN: the tab disappears.
 * - `message` — everything else, rendered as text with `role="alert"`.
 */
export type DevConsoleErrorView =
  | { kind: "none" }
  | { kind: "hidden"; code: string }
  | { kind: "message"; code: string; text: string };

type Translate = (key: string, opts?: Record<string, unknown>) => string;

export type ParsedDevConsoleError = {
  status?: number;
  code?: string;
  description?: string;
  network: boolean;
  message?: string;
};

export function parseDevConsoleError(err: unknown): ParsedDevConsoleError {
  const ax = err as AxiosError<BaseApiResponse<unknown>> | undefined;
  if (ax && typeof ax === "object" && "isAxiosError" in ax && ax.isAxiosError) {
    const res = ax.response;
    if (!res) return { network: true, message: ax.message };
    const body = res.data && typeof res.data === "object" ? res.data : undefined;
    return {
      status: res.status,
      code: body?.error_status?.code,
      description: body?.error_status?.description,
      network: false,
      message: ax.message,
    };
  }
  return { network: false, message: err instanceof Error ? err.message : String(err ?? "") };
}

const HIDDEN_CODES = new Set(["NOT_SUPER_ADMIN", "DEV_CONSOLE_FORBIDDEN"]);

const usd = (n: number | undefined): string => (typeof n === "number" ? n.toFixed(2) : "?");

export function describeDevConsoleError(
  err: unknown,
  t: Translate,
  me?: DevConsoleMe | null
): DevConsoleErrorView {
  const p = parseDevConsoleError(err);

  if (p.status === 401 || p.code === "UNAUTHENTICATED") return { kind: "none" };
  if (p.code && HIDDEN_CODES.has(p.code)) return { kind: "hidden", code: p.code };
  if (p.network) return { kind: "message", code: "NETWORK", text: t("errors.network") };

  switch (p.code) {
    case "OWNER_ONLY":
    case "NOT_FOUND":
    case "NOT_AWAITING_CONTINUE":
    case "PROMPT_CONTAINS_SECRET":
    case "BUSY":
    case "CONSOLE_DISABLED":
      return { kind: "message", code: p.code, text: t(`errors.${p.code}`) };
    case "VALIDATION":
      // `description` names the field — that IS the field error.
      return { kind: "message", code: p.code, text: p.description || t("errors.VALIDATION") };
    case "BUDGET_EXCEEDED":
      return {
        kind: "message",
        code: p.code,
        text: me?.budget
          ? t("errors.BUDGET_EXCEEDED", {
              spent: usd(me.budget.spent_today_usd),
              cap: usd(me.budget.daily_cap_usd),
            })
          : t("errors.BUDGET_EXCEEDED_UNKNOWN"),
      };
    default:
      break;
  }

  if (p.status) {
    return {
      kind: "message",
      code: p.code || `HTTP_${p.status}`,
      text: t("errors.generic", { code: p.code || `HTTP ${p.status}` }),
    };
  }
  return { kind: "message", code: "UNEXPECTED", text: t("errors.unexpected", { message: p.message || "?" }) };
}

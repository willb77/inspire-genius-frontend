import { useMemo, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserLookup } from "@/hooks/dev-console/useDevConsole";
import type { DevConsoleMe, UserLookupCard as LookupResult } from "@/types/devConsole";
import { DevConsoleErrorAlert } from "./DevConsoleErrorAlert";
import { lookupVisible } from "./devConsoleView";

interface UserLookupCardProps {
  me: DevConsoleMe;
}

const day = (iso: string | null | undefined): string | null => (iso ? iso.slice(0, 10) : null);

/**
 * Help & Support → Claude Code → User lookup (CSA #1631, contract A7).
 *
 * One email, a fixed set of read-only checks run by the server: account state,
 * the Cognito sign-in record, the login lockout and usage counts. The model is
 * never involved and every lookup is audited server-side. The honest states are
 * the point: "no account" never says "never registered", a check that could not
 * run says so instead of showing nothing, and conflicting entitlement rows are
 * all shown.
 */
export function UserLookupCard({ me }: UserLookupCardProps) {
  const { t } = useTranslation("devConsole");
  const lookup = useUserLookup();
  const schema = useMemo(() => z.object({ email: z.email(t("lookup.invalidEmail")) }), [t]);
  const { register, handleSubmit, formState } = useForm<{ email: string }>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  if (!lookupVisible(me)) return null;

  const submit = handleSubmit(({ email }) => lookup.mutate(email));

  return (
    <section className="space-y-3" aria-labelledby="dc-lookup-title">
      <h3 id="dc-lookup-title" className="text-sm font-semibold">
        {t("lookup.title")}
      </h3>
      <p className="text-xs text-muted-foreground">{t("lookup.subtitle")}</p>
      <form onSubmit={submit} className="space-y-1" noValidate>
        <Label htmlFor="dc-lookup-email" className="sr-only">
          {t("lookup.email")}
        </Label>
        <div className="flex gap-2">
          <Input
            id="dc-lookup-email"
            type="email"
            autoComplete="off"
            className="h-8 text-xs"
            placeholder={t("lookup.email")}
            {...register("email")}
          />
          <Button type="submit" size="sm" variant="outline" disabled={lookup.isPending}>
            <Search className="mr-1 size-3.5" aria-hidden="true" />
            {lookup.isPending ? t("lookup.submitting") : t("lookup.submit")}
          </Button>
        </div>
        {formState.errors.email ? (
          <p role="alert" className="text-xs text-destructive">
            {formState.errors.email.message}
          </p>
        ) : null}
      </form>
      <DevConsoleErrorAlert error={lookup.error} me={me} />
      {lookup.data ? <LookupResultView result={lookup.data} /> : null}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <li className="text-xs">{children}</li>;
}

export function LookupResultView({ result }: { result: LookupResult }) {
  const { t } = useTranslation("devConsole");
  const yesNo = (v: boolean | null | undefined) =>
    v === null || v === undefined ? t("lookup.unknown") : v ? t("lookup.yes") : t("lookup.no");
  const a = result.account;
  const unavailable = result.unavailable.length ? (
    <p role="alert" className="text-xs text-destructive">
      {t("lookup.unavailable", { checks: result.unavailable.join(", ") })}
    </p>
  ) : null;

  if (!result.found || !a) {
    return (
      <div className="space-y-2 rounded-md border p-3" data-testid="dc-lookup-result">
        {unavailable}
        {result.unavailable.includes("account") ? null : (
          <p className="text-xs">{result.not_found_means || t("lookup.notFound")}</p>
        )}
        <LockoutView result={result} />
      </div>
    );
  }

  const status = a.is_deleted ? t("lookup.deleted") : a.is_active ? t("lookup.active") : t("lookup.inactive");

  return (
    <div className="space-y-3 rounded-md border p-3" data-testid="dc-lookup-result">
      {unavailable}
      {a.duplicate_accounts ? (
        <p role="alert" className="text-xs text-destructive">
          {t("lookup.duplicate")}
        </p>
      ) : null}
      <div>
        <h4 className="text-xs font-semibold">{t("lookup.account")}</h4>
        <ul className="space-y-0.5">
          <Row>
            {status}
            {day(a.account_created_at) ? ` · ${t("lookup.created", { date: day(a.account_created_at) })}` : ""}
          </Row>
          <Row>{t("lookup.role", { role: a.role_name || t("lookup.unknown") })}</Row>
          <Row>{a.org_name ? t("lookup.org", { org: a.org_name }) : t("lookup.noOrg")}</Row>
          <Row>{t("lookup.profileComplete", { value: yesNo(a.is_profile_complete) })}</Row>
        </ul>
      </div>
      <div>
        <h4 className="text-xs font-semibold">{t("lookup.entitlements")}</h4>
        {a.entitlement_conflict ? (
          <p role="alert" className="text-xs text-destructive">
            {t("lookup.entitlementConflict")}
          </p>
        ) : null}
        {a.entitlement_rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("lookup.noEntitlements")}</p>
        ) : (
          <ul className="space-y-0.5">
            {a.entitlement_rows.map((row, i) => (
              <Row key={i}>
                {JSON.stringify(row.verticals)} · {t("lookup.matchedBy", { by: row.matched_by })}
              </Row>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h4 className="text-xs font-semibold">{t("lookup.usage")}</h4>
        <ul className="space-y-0.5">
          <Row>{t("lookup.lastLogin", { date: day(a.last_login_at) || t("lookup.never") })}</Row>
          <Row>{t("lookup.logins30d", { count: a.logins_30d })}</Row>
          <Row>{t("lookup.lastChat", { date: day(a.last_chat_retained_at) || t("lookup.never") })}</Row>
          <Row>{t("lookup.chats", { count: a.chats_retained })}</Row>
          <Row>
            {t("lookup.prism", { count: a.prism_results })}
            {day(a.prism_latest_at) ? ` · ${t("lookup.prismLatest", { date: day(a.prism_latest_at) })}` : ""}
          </Row>
          <Row>{t("lookup.documents", { uploaded: a.documents_uploaded, subject: a.documents_as_subject })}</Row>
        </ul>
      </div>
      {result.unavailable.includes("cognito") ? null : (
        <div>
          <h4 className="text-xs font-semibold">{t("lookup.cognito")}</h4>
          {result.cognito?.present ? (
            <ul className="space-y-0.5">
              <Row>{t("lookup.cognitoStatus", { status: result.cognito.status || t("lookup.unknown") })}</Row>
              <Row>{t("lookup.cognitoEnabled", { value: yesNo(result.cognito.enabled) })}</Row>
              <Row>
                {t("lookup.onboarded", { value: result.cognito.is_onboarded ?? t("lookup.unknown") })}
                <span className="block text-muted-foreground">{t("lookup.onboardedNote")}</span>
              </Row>
            </ul>
          ) : (
            <p className="text-xs">{t("lookup.cognitoMissing")}</p>
          )}
        </div>
      )}
      <LockoutView result={result} />
      <p className="text-xs text-muted-foreground">{t("lookup.magicLink")}</p>
    </div>
  );
}

function LockoutView({ result }: { result: LookupResult }) {
  const { t } = useTranslation("devConsole");
  if (!result.lockout) return null;
  const l = result.lockout;
  return (
    <div>
      <h4 className="text-xs font-semibold">{t("lookup.lockout")}</h4>
      <p className="text-xs">
        {t("lookup.lockoutCount", { count: l.failed_attempts, minutes: l.window_minutes ?? 15, limit: l.limit ?? 5 })}
      </p>
      <p className="text-xs">{l.locked ? t("lookup.locked") : t("lookup.notLocked")}</p>
    </div>
  );
}

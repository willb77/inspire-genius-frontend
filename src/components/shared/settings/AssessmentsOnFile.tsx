/**
 * "On file" — the person's current result per framework, in Settings → Other
 * Assessments (TDS F-W7-1). Reads only: `GET /v1/profile/me` for the current
 * results and `GET /v1/profile/me/assessments?framework=…` for how many older
 * entries sit behind each. A failed read says so; it never reads as "nothing
 * on file", which is the empty state that hid this gap in the first place.
 */
import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { useAssessmentHistory, useMyProfile } from "@/hooks/profile/useProfile";
import type { ProfileAssessmentView } from "@/types/profile/profile-types";
import {
  earlierCount,
  formatAssessedDate,
  frameworkKey,
  frameworkLabel,
  onFileAssessments,
  resultText,
  sourceKind,
} from "./onFileHelpers";

function OnFileRow({ view }: { view: ProfileAssessmentView }): JSX.Element {
  const { t, i18n } = useTranslation("shellUi");
  const key = frameworkKey(view.framework);
  // limit 1: only `total` is read, so the page size does not matter.
  const history = useAssessmentHistory(key, { limit: 1, offset: 0 });
  const earlier = history.isSuccess ? earlierCount(history.data?.total) : 0;
  const kind = sourceKind(view.source);
  const source =
    kind === "entered"
      ? t("assessments.sourceEntered", { defaultValue: "Entered by you" })
      : kind === "report"
        ? t("assessments.sourceReport", { defaultValue: "From a report" })
        : t("assessments.sourceOther", { defaultValue: "Added to your profile" });
  const result = resultText(view);

  return (
    <li className="rounded-md border border-border/60 p-3" data-testid={`on-file-${key}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <p className="text-sm font-medium">{frameworkLabel(view.framework)}</p>
        <p className="text-xs text-muted-foreground">
          {formatAssessedDate(view.assessed_at, i18n.language)} · {source}
          {earlier > 0 && (
            <span data-testid={`on-file-earlier-${key}`}>
              {" · "}
              {t("assessments.onFileEarlier", { defaultValue: "+{{n}} earlier", n: earlier })}
            </span>
          )}
        </p>
      </div>
      {result && <p className="mt-1 text-sm">{result}</p>}
    </li>
  );
}

export default function AssessmentsOnFile(): JSX.Element {
  const { t } = useTranslation("shellUi");
  const profile = useMyProfile();

  let body: JSX.Element;
  if (profile.isPending) {
    body = (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("assessments.onFileLoading", { defaultValue: "Loading your results…" })}
      </p>
    );
  } else if (profile.isError) {
    body = (
      <p role="alert" className="text-sm text-destructive">
        {t("assessments.onFileError", {
          defaultValue: "We could not load your results. Reload the page to try again.",
        })}
      </p>
    );
  } else {
    const views = onFileAssessments(profile.data);
    body =
      views.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="on-file-empty">
          {t("assessments.onFileEmpty", { defaultValue: "Nothing on file yet. Results you add appear here." })}
        </p>
      ) : (
        <ul className="space-y-2">
          {views.map((v) => (
            <OnFileRow key={frameworkKey(v.framework)} view={v} />
          ))}
        </ul>
      );
  }

  return (
    <section className="space-y-2" data-testid="assessments-on-file" aria-label={t("assessments.onFileTitle", { defaultValue: "On file" })}>
      <p className="text-sm font-medium">{t("assessments.onFileTitle", { defaultValue: "On file" })}</p>
      {body}
    </section>
  );
}

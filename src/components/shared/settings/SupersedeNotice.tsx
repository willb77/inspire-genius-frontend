/**
 * In an Add or Upload dialog: "you already have one of these" (TDS F-W7-1).
 *
 * Every reader takes the latest authoritative result per framework, so saving
 * a second one replaces the first as the current result; the first stays in
 * the history. W7 saved a second CliftonStrengths result with no word about
 * that. Renders nothing while the profile loads, on a failed read, or when the
 * framework is not on file.
 */
import type { JSX } from "react";
import { useTranslation } from "react-i18next";

import { useMyProfile } from "@/hooks/profile/useProfile";
import { findOnFile, formatAssessedDate, frameworkLabel } from "./onFileHelpers";

export default function SupersedeNotice({ framework }: { framework: string }): JSX.Element | null {
  const { t, i18n } = useTranslation("shellUi");
  const profile = useMyProfile();
  const current = profile.isSuccess ? findOnFile(profile.data, framework) : undefined;
  if (!current) return null;
  return (
    <p className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground" data-testid="supersede-notice">
      {t("assessments.supersede", {
        defaultValue:
          "You already have a {{framework}} result from {{date}}. Saving this one makes it the current result; the earlier one stays in your history.",
        framework: frameworkLabel(current.framework),
        date: formatAssessedDate(current.assessed_at, i18n.language),
      })}
    </p>
  );
}

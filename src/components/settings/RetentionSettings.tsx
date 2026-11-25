/**
 * Memory retention settings card.
 *
 * Renders inside super-admin, manager, and company-admin Settings pages.
 * Each role is offered only the scopes it can write
 * (RETENTION_WRITE_SCOPES_BY_ROLE, mirroring the backend gate); a role with
 * none does not see the card:
 *   - super-admin   → all scopes (system, org, manager, user)
 *   - company-admin → org / manager / user
 *   - manager       → user (their direct reports)
 *
 * Tiers are the 4 from the agent-engine memory model:
 *   working, short_term, long_term, semantic
 */
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Trash2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useDeleteRetentionPolicy,
  useRetentionPolicies,
  useUpsertRetentionPolicy,
} from "@/hooks/retention/useRetention";
import type {
  RetentionPolicy,
  RetentionScope,
  RetentionTier,
} from "@/services/retention/retentionService";
import { useAuth } from "@/context/useAuth";
import { retentionWriteScopes } from "@/constants/retentionScopes";
import { useTranslation } from "react-i18next";

const ALL_TIERS: { value: RetentionTier; label: string; help: string }[] = [
  {
    value: "working",
    label: "Working memory",
    help: "In-process scratchpad. Default 0 days (never persisted).",
  },
  {
    value: "short_term",
    label: "Short-term (chat messages)",
    help:
      "Aurora chat_messages + conversation_messages + chat_jobs. Default 90 days, archived.",
  },
  {
    value: "long_term",
    label: "Long-term (summaries)",
    help: "Aurora long-term memory + summaries. Default 730 days, archived.",
  },
  {
    value: "semantic",
    label: "Semantic (pgvector embeddings)",
    help: "Vector store. Default forever (compaction is a separate job).",
  },
];

type Draft = {
  scope: RetentionScope;
  scope_id: string;
  memory_tier: RetentionTier;
  retention_days: number | null;
  archive_to_s3: boolean;
};

const EMPTY_DRAFT: Draft = {
  scope: "system",
  scope_id: "",
  memory_tier: "short_term",
  retention_days: 90,
  archive_to_s3: true,
};

export default function RetentionSettings() {
  const { t } = useTranslation("accountUi")
  const { user } = useAuth();
  const scopeOptions = useMemo<readonly RetentionScope[]>(
    () => retentionWriteScopes(user?.role),
    [user?.role],
  );

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  // The role can arrive after first render, so never trust a stored scope the
  // role may not write: fall back to the first scope it may.
  const effectiveScope: RetentionScope = scopeOptions.includes(draft.scope)
    ? draft.scope
    : (scopeOptions[0] ?? draft.scope);

  const policiesQuery = useRetentionPolicies();
  const upsert = useUpsertRetentionPolicy();
  const remove = useDeleteRetentionPolicy();

  const policies = policiesQuery.data ?? [];

  const handleSave = () => {
    if (!scopeOptions.includes(effectiveScope)) {
      toast.error(t("retentionSettings.yourRoleCannotWriteAtScope", { defaultValue: "Your role cannot write at scope={{scope}}.", scope: effectiveScope }));
      return;
    }
    if (effectiveScope !== "system" && !draft.scope_id.trim()) {
      toast.error(t("retentionSettings.scopeIdIsRequiredForNon", { defaultValue: "Scope ID is required for non-system scopes." }));
      return;
    }
    upsert.mutate(
      {
        scope: effectiveScope,
        scope_id: effectiveScope === "system" ? null : draft.scope_id.trim(),
        memory_tier: draft.memory_tier,
        retention_days: draft.retention_days,
        archive_to_s3: draft.archive_to_s3,
      },
      {
        onSuccess: () => toast.success(t("retentionSettings.retentionPolicySaved", { defaultValue: "Retention policy saved" })),
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail ?? t("retentionSettings.failedToSaveRetentionPolicy", { defaultValue: "Failed to save retention policy" });
          toast.error(msg);
        },
      },
    );
  };

  const handleDelete = (p: RetentionPolicy) => {
    if (!scopeOptions.includes(p.scope)) {
      toast.error(t("retentionSettings.youDonTHavePermissionTo", { defaultValue: "You don't have permission to delete this policy." }));
      return;
    }
    remove.mutate(p.id, {
      onSuccess: () => toast.success(t("retentionSettings.policyDeletedFallingBackToParent", { defaultValue: "Policy deleted — falling back to parent scope" })),
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { detail?: string } } }).response?.data
            ?.detail ?? t("retentionSettings.failedToDelete", { defaultValue: "Failed to delete" });
        toast.error(msg);
      },
    });
  };

  if (scopeOptions.length === 0) {
    // A role that may write no scope does not see the card at all.
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          {t("retentionSettings.memoryRetention", { defaultValue: "Memory Retention" })}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("retentionSettings.controlHowLongEachTierOf", { defaultValue: "Control how long each tier of agent memory is kept before the nightly archive Lambda moves it to S3 and deletes it from Aurora. More-specific scopes override less-specific ones (user > manager > org > system)." })}
        </p>
      </CardHeader>
      <CardContent className="space-y-6 text-left">
        {/* ── Existing policies ── */}
        <div>
          <h4 className="text-sm font-medium mb-2">{t("retentionSettings.activePolicies", { defaultValue: "Active policies" })}</h4>
          {policiesQuery.isPending ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("retentionSettings.loading", { defaultValue: "Loading…" })}
            </p>
          ) : policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("retentionSettings.noPoliciesConfigured", { defaultValue: "No policies configured." })}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">{t("retentionSettings.scope", { defaultValue: "Scope" })}</th>
                    <th className="py-1 pr-3">{t("retentionSettings.scopeId", { defaultValue: "Scope ID" })}</th>
                    <th className="py-1 pr-3">{t("retentionSettings.tier", { defaultValue: "Tier" })}</th>
                    <th className="py-1 pr-3">{t("retentionSettings.retention", { defaultValue: "Retention" })}</th>
                    <th className="py-1 pr-3">{t("retentionSettings.archive", { defaultValue: "Archive?" })}</th>
                    <th className="py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="py-1 pr-3 font-mono text-xs">{p.scope}</td>
                      <td className="py-1 pr-3 font-mono text-xs">
                        {p.scope_id ?? "—"}
                      </td>
                      <td className="py-1 pr-3">{p.memory_tier}</td>
                      <td className="py-1 pr-3">
                        {p.retention_days == null
                          ? t("retentionSettings.never", { defaultValue: "never" })
                          : t("retentionSettings.daysShort", { defaultValue: "{{days}}d", days: p.retention_days })}
                      </td>
                      <td className="py-1 pr-3">
                        {p.archive_to_s3 ? t("retentionSettings.yes", { defaultValue: "yes" }) : t("retentionSettings.no", { defaultValue: "no" })}
                      </td>
                      <td className="py-1 text-right">
                        {scopeOptions.includes(p.scope) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(p)}
                            disabled={remove.isPending}
                            aria-label={t("retentionSettings.deletePolicy", { defaultValue: "Delete policy" })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Upsert form ── */}
        {scopeOptions.length > 0 && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-medium">{t("retentionSettings.addOrUpdateAPolicy", { defaultValue: "Add or update a policy" })}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Scope */}
              <div>
                <Label className="text-xs">{t("retentionSettings.scope", { defaultValue: "Scope" })}</Label>
                <Select
                  value={effectiveScope}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, scope: v as RetentionScope }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("retentionSettings.scope", { defaultValue: "Scope" })} />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scope ID */}
              <div>
                <Label className="text-xs" htmlFor="retention-scope-id">
                  {t("retentionSettings.scopeId", { defaultValue: "Scope ID" })} {effectiveScope === "system" && t("retentionSettings.unusedForSystemScope", { defaultValue: "(unused for system scope)" })}
                </Label>
                <Input
                  id="retention-scope-id"
                  value={effectiveScope === "system" ? "" : draft.scope_id}
                  disabled={effectiveScope === "system"}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, scope_id: e.target.value }))
                  }
                  placeholder={t("retentionSettings.uuidForOrgUserManager", { defaultValue: "UUID for org / user / manager" })}
                />
              </div>

              {/* Tier */}
              <div>
                <Label className="text-xs">{t("retentionSettings.tier", { defaultValue: "Tier" })}</Label>
                <Select
                  value={draft.memory_tier}
                  onValueChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      memory_tier: v as RetentionTier,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("retentionSettings.tier", { defaultValue: "Tier" })} />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_TIERS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>{t.label}</span>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <span className="max-w-xs text-xs">{t.help}</span>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Retention days */}
              <div>
                <Label className="text-xs" htmlFor="retention-days">
                  {t("retentionSettings.retentionDaysBlankNeverExpire", { defaultValue: "Retention days (blank = never expire)" })}
                </Label>
                <Input
                  id="retention-days"
                  type="number"
                  min={0}
                  value={draft.retention_days ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      retention_days:
                        e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                />
              </div>

              {/* Archive switch */}
              <div className="flex items-center gap-3">
                <Switch
                  id="retention-archive"
                  checked={draft.archive_to_s3}
                  onCheckedChange={(c) =>
                    setDraft((d) => ({ ...d, archive_to_s3: c }))
                  }
                />
                <Label
                  htmlFor="retention-archive"
                  className="text-sm font-medium"
                >
                  {t("retentionSettings.archiveToS3BeforeDelete", { defaultValue: "Archive to S3 before delete" })}
                </Label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={upsert.isPending}
                className="gap-2"
              >
                {upsert.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t("retentionSettings.savePolicy", { defaultValue: "Save policy" })}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

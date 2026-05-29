/**
 * Memory retention settings card.
 *
 * Renders inside super-admin, manager, and company-admin Settings pages.
 * Each role sees the scopes it can write (gated by the backend):
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
import { ROLES } from "@/constants/routes";

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

const SCOPE_OPTIONS_BY_ROLE: Record<string, RetentionScope[]> = {
  "super-admin": ["system", "org", "manager", "user"],
  "company-admin": ["org", "manager", "user"],
  manager: ["user"],
  practitioner: ["user"],
  user: [],
  distributor: [],
};

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
  const { user } = useAuth();
  const role = (user?.role ?? "user").toLowerCase();
  const canWriteAnyScope = SCOPE_OPTIONS_BY_ROLE[role]?.length ?? 0;
  const scopeOptions = useMemo<RetentionScope[]>(
    () => SCOPE_OPTIONS_BY_ROLE[role] ?? [],
    [role],
  );

  const [draft, setDraft] = useState<Draft>(() => ({
    ...EMPTY_DRAFT,
    scope: scopeOptions[0] ?? "system",
  }));

  const policiesQuery = useRetentionPolicies();
  const upsert = useUpsertRetentionPolicy();
  const remove = useDeleteRetentionPolicy();

  const policies = policiesQuery.data ?? [];

  const handleSave = () => {
    if (!scopeOptions.includes(draft.scope)) {
      toast.error(`Your role cannot write at scope=${draft.scope}.`);
      return;
    }
    if (draft.scope !== "system" && !draft.scope_id.trim()) {
      toast.error("Scope ID is required for non-system scopes.");
      return;
    }
    upsert.mutate(
      {
        scope: draft.scope,
        scope_id: draft.scope === "system" ? null : draft.scope_id.trim(),
        memory_tier: draft.memory_tier,
        retention_days: draft.retention_days,
        archive_to_s3: draft.archive_to_s3,
      },
      {
        onSuccess: () => toast.success("Retention policy saved"),
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail ?? "Failed to save retention policy";
          toast.error(msg);
        },
      },
    );
  };

  const handleDelete = (p: RetentionPolicy) => {
    if (!scopeOptions.includes(p.scope)) {
      toast.error("You don't have permission to delete this policy.");
      return;
    }
    remove.mutate(p.id, {
      onSuccess: () => toast.success("Policy deleted — falling back to parent scope"),
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { detail?: string } } }).response?.data
            ?.detail ?? "Failed to delete";
        toast.error(msg);
      },
    });
  };

  if (canWriteAnyScope === 0 && role !== ROLES.USER) {
    // Roles with zero permitted scopes don't see the card at all.
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Memory Retention
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Control how long each tier of agent memory is kept before the
          nightly archive Lambda moves it to S3 and deletes it from Aurora.
          More-specific scopes override less-specific ones (user &gt; manager
          &gt; org &gt; system).
        </p>
      </CardHeader>
      <CardContent className="space-y-6 text-left">
        {/* ── Existing policies ── */}
        <div>
          <h4 className="text-sm font-medium mb-2">Active policies</h4>
          {policiesQuery.isPending ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No policies configured.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">Scope</th>
                    <th className="py-1 pr-3">Scope ID</th>
                    <th className="py-1 pr-3">Tier</th>
                    <th className="py-1 pr-3">Retention</th>
                    <th className="py-1 pr-3">Archive?</th>
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
                          ? "never"
                          : `${p.retention_days}d`}
                      </td>
                      <td className="py-1 pr-3">
                        {p.archive_to_s3 ? "yes" : "no"}
                      </td>
                      <td className="py-1 text-right">
                        {scopeOptions.includes(p.scope) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(p)}
                            disabled={remove.isPending}
                            aria-label="Delete policy"
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
            <h4 className="text-sm font-medium">Add or update a policy</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Scope */}
              <div>
                <Label className="text-xs">Scope</Label>
                <Select
                  value={draft.scope}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, scope: v as RetentionScope }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Scope" />
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
                  Scope ID {draft.scope === "system" && "(unused for system scope)"}
                </Label>
                <Input
                  id="retention-scope-id"
                  value={draft.scope === "system" ? "" : draft.scope_id}
                  disabled={draft.scope === "system"}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, scope_id: e.target.value }))
                  }
                  placeholder="UUID for org / user / manager"
                />
              </div>

              {/* Tier */}
              <div>
                <Label className="text-xs">Tier</Label>
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
                    <SelectValue placeholder="Tier" />
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
                  Retention days (blank = never expire)
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
                  Archive to S3 before delete
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
                Save policy
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

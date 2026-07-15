/**
 * ProfileV2 — the new-design ("HomeV2" system) variant of Profile. Flag-gated
 * (new_user_surfaces) additive swap; the classic page is unchanged and remains
 * at /profile/classic. Same data/hooks/logic — only the presentation is
 * re-skinned to the cream panel + tokens + serif headings. RTL-safe (logical CSS).
 *
 * Renders four sections from the new user-profile-platform:
 *  1. Header  — name + bio + role / industry / years
 *  2. Timeline — chronological assessment cards grouped by framework
 *  3. Trend chart — recharts line, framework + dimension pickers
 *  4. Privacy panel — per-framework "include in chat context" toggles
 *     (visual-only stub in v1; see TODO)
 */

import { useEffect, useMemo, useState } from "react";
import UserLayout from "@/layouts/UserLayout";
import { V2Panel, V2Card } from "@/components/v2";
import {
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sparkles, ChevronRight } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import { toast } from "sonner";
import {
  useAssessmentHistory,
  useAssessmentTrend,
  useCreateFact,
  useMyProfile,
} from "@/hooks/profile/useProfile";
import type {
  Assessment,
  AssessmentScore,
  LoadedFramework,
  ProfileFact,
} from "@/types/profile/profile-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return iso;
    return format(d, "dd MMM yyyy");
  } catch {
    return iso;
  }
}

function pickFact(
  facts: ProfileFact[] | undefined,
  category: string,
  key: string,
): string {
  if (!facts) return "";
  const m = facts.find(
    (f) => f.category === category && f.key === key && !f.superseded_at,
  );
  return m?.value ?? "";
}

function topThreeScores(scores: AssessmentScore[] | undefined): AssessmentScore[] {
  if (!scores || scores.length === 0) return [];
  return [...scores].sort((a, b) => b.score - a.score).slice(0, 3);
}

function groupByFramework(
  assessments: Assessment[],
): Record<string, Assessment[]> {
  const out: Record<string, Assessment[]> = {};
  for (const a of assessments) {
    (out[a.framework] = out[a.framework] ?? []).push(a);
  }
  // Sort each group's history newest first.
  for (const fw of Object.keys(out)) {
    out[fw].sort(
      (a, b) =>
        new Date(b.assessed_at).getTime() - new Date(a.assessed_at).getTime(),
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Section: Header
// ---------------------------------------------------------------------------

function ProfileHeader({
  facts,
  loading,
}: {
  facts: ProfileFact[] | undefined;
  loading: boolean;
}) {
  const name = pickFact(facts, "identity", "name");
  const bio = pickFact(facts, "bio", "summary");
  const role = pickFact(facts, "career", "current_role");
  const industry = pickFact(facts, "career", "industry");
  const years = pickFact(facts, "career", "years_experience");

  return (
    <V2Card className="flex flex-col gap-6 px-0">
      <CardHeader className="text-start">
        <CardTitle className="text-xl font-semibold font-serif text-ink">
          {loading ? <Skeleton className="h-6 w-40" /> : name || "Your profile"}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-start space-y-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <>
            {bio ? (
              <p className="text-sm text-body-slate">{bio}</p>
            ) : (
              <p className="text-sm text-body-slate italic">
                Add a short bio under Settings → Personal Data.
              </p>
            )}
            <div className="flex flex-wrap gap-2 text-xs">
              {role && <Badge variant="outline">Role: {role}</Badge>}
              {industry && <Badge variant="outline">Industry: {industry}</Badge>}
              {years && (
                <Badge variant="outline">Experience: {years} yrs</Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </V2Card>
  );
}

// ---------------------------------------------------------------------------
// Section: Assessments Timeline
// ---------------------------------------------------------------------------

function AssessmentsTimeline({
  assessments,
  loading,
}: {
  assessments: Assessment[];
  loading: boolean;
}) {
  const [selected, setSelected] = useState<Assessment | null>(null);
  const groups = useMemo(() => groupByFramework(assessments), [assessments]);
  const frameworks = Object.keys(groups).sort();

  return (
    <V2Card className="flex flex-col gap-6 px-0">
      <CardHeader className="text-start">
        <CardTitle className="text-lg font-semibold font-serif text-ink">Assessments</CardTitle>
        <p className="text-sm text-body-slate">
          Every assessment you've added, grouped by framework. Click a card for
          the full breakdown.
        </p>
      </CardHeader>
      <CardContent className="text-start space-y-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : frameworks.length === 0 ? (
          <p className="text-sm text-body-slate italic">
            No assessments yet. Add one under Settings → Other Assessments, or
            complete a PRISM survey.
          </p>
        ) : (
          frameworks.map((fw) => (
            <div key={fw} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-mute">
                {fw}
              </h3>
              <div className="space-y-2">
                {groups[fw].map((a) => {
                  const top = topThreeScores(a.parsed_scores);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className="w-full text-start rounded-md border border-hairline p-3 hover:bg-panel transition-colors flex items-center justify-between gap-3"
                      onClick={() => setSelected(a)}
                      data-testid={`assessment-card-${a.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {fw}
                          {a.framework_version
                            ? ` v${a.framework_version}`
                            : ""}
                        </div>
                        <div className="text-xs text-body-slate">
                          Assessed {fmtDate(a.assessed_at)}
                        </div>
                        {top.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {top.map((s) => (
                              <Badge
                                key={`${a.id}-${s.dimension}`}
                                variant="secondary"
                                className="text-xs"
                              >
                                {s.dimension}: {Math.round(s.score)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-body-slate shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Sheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selected?.framework}
              {selected?.framework_version
                ? ` v${selected.framework_version}`
                : ""}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="p-4 space-y-4 text-sm">
              <div className="text-body-slate">
                Assessed {fmtDate(selected.assessed_at)}
                {selected.source ? ` · ${selected.source}` : ""}
              </div>
              {selected.parsed_scores && selected.parsed_scores.length > 0 ? (
                <div>
                  <h4 className="font-semibold font-serif text-ink mb-2">All dimensions</h4>
                  <ul className="space-y-1">
                    {[...selected.parsed_scores]
                      .sort((a, b) => b.score - a.score)
                      .map((s) => (
                        <li
                          key={`${s.dimension}-${s.score_type ?? ""}`}
                          className="flex justify-between gap-3 border-b border-hairline py-1.5"
                        >
                          <span>
                            {s.dimension}
                            {s.score_type ? (
                              <span className="ms-1 text-xs text-body-slate">
                                ({s.score_type})
                              </span>
                            ) : null}
                          </span>
                          <span className="font-mono">
                            {Math.round(s.score)}
                            {typeof s.percentile === "number"
                              ? ` (p${Math.round(s.percentile)})`
                              : ""}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
              {selected.typing && selected.typing.length > 0 && (
                <div>
                  <h4 className="font-semibold font-serif text-ink mb-2">Typing</h4>
                  <ul className="space-y-1">
                    {selected.typing.map((t) => (
                      <li key={t.type_code} className="flex justify-between">
                        <span>{t.label ?? t.type_code}</span>
                        <span className="font-mono">
                          {t.type_code}
                          {typeof t.clarity === "number"
                            ? ` · clarity ${Math.round(t.clarity)}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </V2Card>
  );
}

// ---------------------------------------------------------------------------
// Section: Trend chart
// ---------------------------------------------------------------------------

function TrendChart({
  loadedFrameworks,
  dimensionsByFramework,
}: {
  loadedFrameworks: LoadedFramework[];
  dimensionsByFramework: Record<string, string[]>;
}) {
  const [framework, setFramework] = useState<string | undefined>(
    loadedFrameworks[0],
  );
  const [dimension, setDimension] = useState<string | undefined>();

  // When framework changes, default the dimension to the first known dim.
  useEffect(() => {
    if (!framework) return;
    const dims = dimensionsByFramework[framework] ?? [];
    if (dims.length > 0 && (!dimension || !dims.includes(dimension))) {
      setDimension(dims[0]);
    }
  }, [framework, dimension, dimensionsByFramework]);

  const trend = useAssessmentTrend(framework, dimension);

  const chartData = useMemo(() => {
    const pts = trend.data?.points ?? [];
    return pts.map((p) => ({
      x: fmtDate(p.assessed_at),
      score: p.score,
    }));
  }, [trend.data]);

  const dimsForCurrent = framework
    ? dimensionsByFramework[framework] ?? []
    : [];

  return (
    <V2Card className="flex flex-col gap-6 px-0">
      <CardHeader className="text-start">
        <CardTitle className="text-lg font-semibold font-serif text-ink">Trend</CardTitle>
        <p className="text-sm text-body-slate">
          Track how a dimension has moved over time.
        </p>
      </CardHeader>
      <CardContent className="text-start space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="trend-framework">Framework</Label>
            <Select
              value={framework ?? ""}
              onValueChange={(v) => setFramework(v || undefined)}
            >
              <SelectTrigger id="trend-framework">
                <SelectValue placeholder="Pick a framework" />
              </SelectTrigger>
              <SelectContent>
                {loadedFrameworks.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="trend-dimension">Dimension</Label>
            <Select
              value={dimension ?? ""}
              onValueChange={(v) => setDimension(v || undefined)}
              disabled={dimsForCurrent.length === 0}
            >
              <SelectTrigger id="trend-dimension">
                <SelectValue placeholder="Pick a dimension" />
              </SelectTrigger>
              <SelectContent>
                {dimsForCurrent.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="h-64 w-full" data-testid="trend-chart">
          {trend.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-full w-full grid place-items-center text-sm text-body-slate italic">
              Not enough data points for a trend yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-accent-orange)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </V2Card>
  );
}

// ---------------------------------------------------------------------------
// Section: Privacy panel (visual-only in v1)
// ---------------------------------------------------------------------------

function PrivacyPanel({
  loadedFrameworks,
  chatExcludedFrameworks,
}: {
  loadedFrameworks: LoadedFramework[];
  chatExcludedFrameworks: string[];
}) {
  // Persisted for real: the excluded set is a `privacy / chat_excluded_frameworks`
  // profile fact (comma-list). The agent-engine loader reads it and drops those
  // frameworks from <USER_PROFILE>, so turning one off actually removes it from
  // every conversation. Saving via useCreateFact invalidates the /me query, so
  // the switch reflects the persisted state.
  const createFact = useCreateFact();
  const excludedSet = useMemo(
    () => new Set(chatExcludedFrameworks.map((f) => f.toUpperCase())),
    [chatExcludedFrameworks],
  );

  const setIncluded = (framework: string, include: boolean): void => {
    const next = new Set(excludedSet);
    if (include) next.delete(framework.toUpperCase());
    else next.add(framework.toUpperCase());
    createFact.mutate(
      {
        category: "privacy",
        key: "chat_excluded_frameworks",
        value: Array.from(next).sort().join(","),
      },
      { onError: () => toast.error("Couldn't save your privacy setting.") },
    );
  };

  return (
    <V2Card className="flex flex-col gap-6 px-0">
      <CardHeader className="text-start">
        <CardTitle className="text-lg font-semibold font-serif text-ink">Privacy</CardTitle>
        <p className="text-sm text-body-slate">
          Choose which frameworks Meridian can see in chat. Turning one off
          removes it from every conversation.
        </p>
      </CardHeader>
      <CardContent className="text-start space-y-3">
        {loadedFrameworks.length === 0 ? (
          <p className="text-sm text-body-slate italic">
            Once you have assessments loaded they'll show up here.
          </p>
        ) : (
          loadedFrameworks.map((f) => (
            <div
              key={f}
              className="flex items-center justify-between border-b border-hairline py-2"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-body-slate" />
                <span className="text-sm font-medium">{f}</span>
              </div>
              <Switch
                aria-label={`Include ${f} in chat`}
                checked={!excludedSet.has(f.toUpperCase())}
                disabled={createFact.isPending}
                onCheckedChange={(v) => setIncluded(f, v)}
              />
            </div>
          ))
        )}
      </CardContent>
    </V2Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProfileV2() {
  const me = useMyProfile();
  const history = useAssessmentHistory(undefined, { limit: 100, offset: 0 });

  const facts = me.data?.facts;
  const loadedFrameworks = me.data?.loaded_frameworks ?? [];
  // Memoise so the `??` fallback doesn't produce a new array reference on
  // every render (which would make every downstream useMemo dep stale).
  const assessments = useMemo(
    () => history.data?.assessments ?? [],
    [history.data],
  );

  // Build the dimension picker source from the user's actual assessments —
  // each framework's full dimension list is the union of all parsed_scores
  // dimensions seen across that framework's history.
  const dimensionsByFramework = useMemo(() => {
    const out: Record<string, Set<string>> = {};
    for (const a of assessments) {
      const set = (out[a.framework] = out[a.framework] ?? new Set());
      for (const s of a.parsed_scores ?? []) set.add(s.dimension);
    }
    const flat: Record<string, string[]> = {};
    for (const fw of Object.keys(out)) flat[fw] = Array.from(out[fw]).sort();
    return flat;
  }, [assessments]);

  return (
    <UserLayout>
      <V2Panel>
        <div className="space-y-4" data-testid="profile-page">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight font-serif text-ink">Profile</h1>
            <p className="text-sm text-body-slate">
              What Meridian sees about you, and how she uses it.
            </p>
          </div>

          <ProfileHeader facts={facts} loading={me.isLoading} />

          <AssessmentsTimeline
            assessments={assessments}
            loading={history.isLoading}
          />

          <TrendChart
            loadedFrameworks={loadedFrameworks}
            dimensionsByFramework={dimensionsByFramework}
          />

          <PrivacyPanel
            loadedFrameworks={loadedFrameworks}
            chatExcludedFrameworks={me.data?.chat_excluded_frameworks ?? []}
          />

          {me.isError && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              We couldn't load your profile right now. If you just signed up this
              is normal — try again after adding your first fact under Settings.
            </div>
          )}
        </div>
      </V2Panel>
    </UserLayout>
  );
}

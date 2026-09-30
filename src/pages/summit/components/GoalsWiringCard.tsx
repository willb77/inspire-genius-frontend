import { Card, CardH, MiniLabel } from "@/pages/summit/components/ui";
import { useJobFitComponentsEnabled } from "@/hooks/switches/useJobFitComponentsEnabled";
import { useGoalsWiring } from "@/hooks/job-fit/useFitComponents";
import type { WiringGoal } from "@/types/job-fit/components";

const GROUPS: { verdict: WiringGoal["verdict"]; label: string; tone: string }[] = [
  { verdict: "supported", label: "Your wiring carries these", tone: "text-[#15803d]" },
  { verdict: "mixed", label: "Mixed — some of you for it, some against", tone: "text-[#b45309]" },
  { verdict: "at-tension", label: "Your wiring pulls against these", tone: "text-[#b91c1c]" },
  { verdict: "unmapped", label: "Not linked to a career family yet", tone: "text-[#6b7280]" },
];

/**
 * Feeds Phase 2 — "Your goals and your wiring" on the Goals Studio Overview.
 * The stage-6 alignment engine's read of the person's published goals against
 * their own PRISM. At-tension is shown with the dimensions doing the pulling —
 * the honest part, never hidden. Renders nothing while the server switch is off.
 */
export function GoalsWiringCard() {
  const on = useJobFitComponentsEnabled();
  const { data, isError, isLoading } = useGoalsWiring(on);
  if (!on || isLoading) return null;

  if (isError || !data) {
    return (
      <Card>
        <MiniLabel>Your goals and your wiring</MiniLabel>
        <p role="alert" className="text-[14px] text-[#13294B]/80">
          We couldn&apos;t read how your goals sit with your PRISM just now.
        </p>
      </Card>
    );
  }
  if (data.goals.length === 0) return null;

  return (
    <Card testId="goals-wiring-card">
      <MiniLabel>Your goals and your wiring</MiniLabel>
      <CardH>How your published goals sit with how you&apos;re wired</CardH>
      {!data.scored ? (
        <p className="text-[14px] text-[#13294B]/80">
          Complete PRISM and this card reads each goal against your profile.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {GROUPS.map(({ verdict, label, tone }) => {
            const goals = data.goals.filter((g) => g.verdict === verdict);
            if (goals.length === 0) return null;
            return (
              <div key={verdict}>
                <div className={`text-[12.5px] font-semibold ${tone}`}>{label}</div>
                <ul className="mt-1 flex flex-col gap-1 text-[14px] text-[#13294B]">
                  {goals.map((g) => (
                    <li key={g.goalId ?? g.title ?? ""}>
                      {g.title}
                      {verdict === "at-tension" && g.opposing.length > 0 && (
                        <span className="text-[#13294B]/70"> — pulling against it: {g.opposing.join(" and ")}</span>
                      )}
                      {verdict === "supported" && g.supporting.length > 0 && (
                        <span className="text-[#13294B]/70"> — carried by {g.supporting.join(" and ")}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

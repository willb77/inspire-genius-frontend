/**
 * My development — `/my/development` (TDS-4c).
 *
 * The member's own view of what a coach sees about them in the Team
 * Development Studio: the same rows, self-scoped, in second person, with none
 * of the coach-side controls. Nothing on this page needs a manager — every
 * read is a `/v1/growth/me/*` route that resolves the member from the verified
 * token, so a plain `user` account reaches all of it.
 *
 * ## What is here
 *
 * Gaps · Learning · Milestones · Coach reviews · My PRISM reading. Each is its
 * own component with its own query, so one section failing leaves the other
 * four readable — a single page-level query would take the whole page down for
 * the loss of any one route.
 *
 * ## What is deliberately NOT here
 *
 * **Targets, Roadmaps and Practice.** The v2.3 brief for this package lists
 * all three, and their backends do not exist: `git grep` over
 * origin/development for `goal_targets`, `goal_roadmap` and `practice_session`
 * across `services/` returns nothing. Feeds Phase 3 (targets, roadmaps) is an
 * open and HELD CSA (#1518) and Phase 4 (scored practice) has not started, so
 * the sequencing the plan row assumed — TDS-4c after Feeds 3 and 4 — has not
 * happened.
 *
 * They are absent rather than stubbed because a section reading "no targets
 * yet" when the feature does not exist is a lie the person cannot detect: it is
 * the same sentence a working, empty Targets section would show, so it teaches
 * them the feature is theirs and merely unused. A dishonest empty state is the
 * failure mode that hides every other bug in this codebase, which is why it is
 * written into `.claude/rules/change-safety.md` by name.
 *
 * The composition below is a flat list of independent sections, so a Targets
 * section, a Roadmaps section and a Practice section are one line each and
 * restructure nothing — WHEN the Feeds Phase 3 and Phase 4 services land. Do
 * not add them before then. (`src/__tests__/myDevelopmentWiring.test.ts`
 * asserts none of the three is mounted, so it will say so if one arrives
 * early; the element names are spelled out there rather than here, because
 * that guard reads this file as text.)
 *
 * ## Chrome
 *
 * The page is open to every role, so the shell is the signed-in role's own,
 * and `UserLayout` resolves it (RM-1/RM-2): a manager keeps the manager menu, a
 * super-admin the super-admin menu, a user the user menu. Until RM-9a this file
 * chose the layout itself, the same way. It reaches
 * `SidebarScaffold`, which mounts the once-per-page things (`AppShell` no
 * longer exists; see `.claude/rules/architecture.md` → Layouts).
 */
import { HeartPulse } from "lucide-react"
import UserLayout from "@/layouts/UserLayout"
import MyGapsSection from "@/components/user/development/MyGapsSection"
import MyLearningSection from "@/components/user/development/MyLearningSection"
import MyMilestonesSection from "@/components/user/development/MyMilestonesSection"
import MyPrismReadingSection from "@/components/user/development/MyPrismReadingSection"
import MyReviewsSection from "@/components/user/development/MyReviewsSection"
import { useTranslation } from "react-i18next"
import { withPrism } from "@/lib/withPrism"

export default function MyDevelopment() {
  const { t } = useTranslation("userPages")

  return (
    <UserLayout>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6" data-testid="my-development">
        <header className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HeartPulse className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{t("myDevelopment.myDevelopment", "My development")}</h1>
            <p className="text-sm text-muted-foreground">
              {withPrism(t("myDevelopment.whatYourCoachSeesAboutYou", "What your coach sees about you, as you. Your gaps, your learning, your roadmap, what a coach wrote back, and your own PRISM reading."))}
            </p>
          </div>
        </header>

        <div className="space-y-4">
          <MyGapsSection />
          <MyLearningSection />
          <MyMilestonesSection />
          <MyReviewsSection />
          <MyPrismReadingSection />
          {/* Targets (Feeds Phase 3), Roadmaps (Feeds Phase 3) and Practice
              (Feeds Phase 4) belong here, one line each, once those services
              exist. They are NOT stubbed — see the file note above. */}
        </div>
      </div>
    </UserLayout>
  )
}

import AuthHeader from "@/components/auth/AuthHeader"
import AuthLayout from "@/components/auth/AuthLayout"
import { ROUTES } from "@/constants/routes"
import { JoinBrandPanel } from "./JoinBrandPanel"

/**
 * `/events` — public "Upcoming events", linked from /join. No sign-in.
 *
 * STUB. The list will later come from events entered on the IG Administration
 * page and read here through a public intake route. Until that exists this page
 * fetches nothing: no request client, no hook, no query. It renders an honest
 * empty state that points back to the registration form.
 */
export default function EventsPage() {
  return (
    <AuthLayout contentClassName="max-w-[560px]" showTestimonial={false} brandPanel={<JoinBrandPanel />}>
      <AuthHeader title="Upcoming events" />
      <p role="status" className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
        No events are scheduled yet. Register your interest and tick the webinar box to hear when the next one is
        announced.
      </p>
      <p className="mt-6 text-sm">
        <a href={ROUTES.JOIN} className="font-medium text-[#466bc4] underline-offset-4 hover:underline">
          ← Register your interest
        </a>
      </p>
    </AuthLayout>
  )
}

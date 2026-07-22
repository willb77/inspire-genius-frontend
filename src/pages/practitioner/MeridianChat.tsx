import MeridianChat from "@/pages/user/MeridianChat"
import PractitionerLayout from "@/layouts/PractitionerLayout"

/**
 * Practitioner "Chat with Meridian" — a duplicate of the My Workspace Meridian
 * chat, rendered inside the practitioner sidebar chrome.
 *
 * Reuses the shared MeridianChat surface verbatim (same WebSocket / agentApi
 * direct-to-ECS wiring, same tile rail + chat window) via its `LayoutComponent`
 * prop; no chat logic is forked. Gated to practitioner + super-admin by the
 * `/practitioner/*` route prefix (see src/types/roles.ts ROLE_PERMISSIONS).
 */
export default function PractitionerMeridianChat() {
  return <MeridianChat LayoutComponent={PractitionerLayout} />
}

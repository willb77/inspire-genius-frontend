import { registerVertical } from "@/verticals/core"

/**
 * Knowledge Continuity's declaration to Vertical Core.
 *
 * Knowledge Continuity's domain code (pages, services, hooks, types under
 * `src/{pages,services,hooks,types}/knowledge-continuity`) stays where it is;
 * this module is only the binding to Core.
 */
export const KNOWLEDGE_CONTINUITY = registerVertical({
  key: "knowledge-continuity",
  title: "Knowledge Continuity",
  description: "Capture, validate, and transfer expert knowledge before it retires.",
  routePrefix: "/vertical/knowledge-continuity",
  homePath: "/vertical/knowledge-continuity/dashboard",
  accent: "#127A8A",
})

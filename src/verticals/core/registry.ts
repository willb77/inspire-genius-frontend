import type { VerticalKey } from "./types"

/**
 * What a vertical declares about itself to the frontend Core.
 *
 * The registry is what lets shared surfaces (launcher grid, super-admin
 * entitlement UI, sidebar) list verticals without importing each one — add a
 * vertical and it appears in all of them.
 */
export type VerticalDefinition = {
  /** Must match the backend manifest key and the entitlement value. */
  key: VerticalKey
  /** Human-readable name for launchers and admin UI. */
  title: string
  /** One line, shown in the launcher. */
  description?: string
  /** Route tree root. Convention: `/vertical/{key}`. */
  routePrefix: string
  /** Landing route the launcher links to. */
  homePath: string
  /** Optional brand accent (hex). Verticals reuse Core's shell; this is a hint, not a theme. */
  accent?: string
}

const _REGISTRY = new Map<VerticalKey, VerticalDefinition>()

/** Add a vertical to the registry. Duplicate keys are a hard error. */
export function registerVertical(def: VerticalDefinition): VerticalDefinition {
  if (_REGISTRY.has(def.key)) {
    throw new Error(`vertical '${def.key}' already registered`)
  }
  const expected = `/vertical/${def.key}`
  if (def.routePrefix !== expected) {
    throw new Error(
      `vertical '${def.key}' routePrefix is '${def.routePrefix}' but must be '${expected}'`
    )
  }
  _REGISTRY.set(def.key, def)
  return def
}

export function getVertical(key: VerticalKey): VerticalDefinition | undefined {
  return _REGISTRY.get(key)
}

/** All registered verticals, stable-sorted by key. */
export function listVerticals(): VerticalDefinition[] {
  return [..._REGISTRY.values()].sort((a, b) => a.key.localeCompare(b.key))
}

/** The verticals a given entitlement list unlocks — what a launcher should show. */
export function listEntitledVerticals(enabled: string[]): VerticalDefinition[] {
  return listVerticals().filter((v) => enabled.includes(v.key))
}

/** Test seam. Not for application code. */
export function __resetRegistry(): void {
  _REGISTRY.clear()
}

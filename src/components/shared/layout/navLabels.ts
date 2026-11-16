/**
 * Render-time translation for sidebar labels.
 *
 * Nav entries are declared as plain objects at module level
 * (`src/constants/navigation.ts`, the house menus, the vertical launcher), so
 * they cannot call a hook, and several code paths compare `item.label` against
 * English constants (`WORKSPACE_SPLICE_BEFORE_LABEL`, `MENU_TAIL_LABELS`) or key
 * on it (`key={section.label}`, the saved open/closed state per section).
 * The data therefore stays English, and only the text painted on screen goes
 * through here.
 *
 * The key is derived from the English label ("Help & Support" ->
 * `nav.items.Help_Support`), so no registry needs editing for a label to be
 * translatable: add the key to `public/locales/en/shellUi.json`. A label with no
 * entry (a vertical's manifest title, a label added after this file) renders
 * exactly as it was declared - the English fallback is the label itself.
 */

type Translate = (key: string, options: { defaultValue: string }) => unknown

export type NavLabelGroup = "items" | "sections"

/**
 * Key segment for an English label: every run of non-letter/digit characters
 * becomes one underscore, and case is KEPT. Case is kept on purpose: the menus
 * hold both "Cohort Read-out" and "Cohort read-out", "Asset Library" and
 * "Asset library", and a case-folded key would give two different English
 * labels one entry. "" when the label has no letters or digits at all.
 */
export function navKeySegment(label: string): string {
  return label.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "")
}

export function navLabelKey(group: NavLabelGroup, label: string): string {
  return `nav.${group}.${navKeySegment(label)}`
}

/** The label to paint: the translation if one exists, otherwise `label` itself. */
export function translateNavLabel(t: Translate, group: NavLabelGroup, label: string): string {
  if (!label || !navKeySegment(label)) return label
  const key = navLabelKey(group, label)
  const out = t(key, { defaultValue: label })
  // i18next returns the key itself when nothing resolves and no default applies.
  return typeof out === "string" && out !== key ? out : label
}

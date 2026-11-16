// GRANT vertical — shared translated label lookups (I18N-5A).
//
// Several pages show the same population-module and aid-journey labels. They were
// module-level string maps; hooks cannot run at module level, so each entry is a
// function taking `t` and the label is resolved at render time.

import type { TFunction } from "i18next"

const MODULE_LABELS: Record<string, (t: TFunction) => string> = {
  military: (t) => t("modules.military", "Military / Veteran"),
  justice: (t) => t("modules.justice", "Justice-impacted"),
  disability: (t) => t("modules.disability", "Disability"),
  adult: (t) => t("modules.adult", "Returning adult"),
  first_time: (t) => t("modules.first_time", "First-time student"),
  foster: (t) => t("modules.foster", "Foster care"),
  undocumented: (t) => t("modules.undocumented", "Undocumented / DACA"),
  homeless: (t) => t("modules.homeless", "Housing insecure"),
  caregiver: (t) => t("modules.caregiver", "Caregiver"),
  field: (t) => t("modules.field", "Field-specific"),
  tribal: (t) => t("modules.tribal", "Tribal"),
}

/** Friendly label for a population module id; falls back to the raw id. */
export function moduleLabel(id: string, t: TFunction): string {
  return MODULE_LABELS[id]?.(t) ?? id
}

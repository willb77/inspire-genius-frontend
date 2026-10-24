import type { Catalog } from "@/types/curriculum"

/**
 * Versions of one school's catalog year (CUR-UNLOCK).
 *
 * A published catalog is never edited in place; a change is a DRAFT of the
 * same year at the next version, and the published one stays live until that
 * draft is published. These helpers pick siblings out of the school's catalog
 * list so "Edit" opens the draft already in progress instead of starting a
 * second one. Display and navigation only — the server decides what is valid.
 */

function sameYear(a: Catalog, b: Catalog): boolean {
  return a.id !== b.id && a.institutionId === b.institutionId && a.catalogYear === b.catalogYear
}

function newest(catalogs: Catalog[]): Catalog | null {
  return catalogs.reduce<Catalog | null>((best, c) => (best === null || c.version > best.version ? c : best), null)
}

/** The draft of `catalog`'s school and year already in progress, if any (the newest, should there be two). */
export function sameYearDraft(catalogs: Catalog[], catalog: Catalog): Catalog | null {
  return newest(catalogs.filter((c) => c.status === "draft" && sameYear(c, catalog)))
}

/** The published (live) version of `catalog`'s school and year, other than itself. */
export function liveVersionOf(catalogs: Catalog[], catalog: Catalog): Catalog | null {
  return newest(catalogs.filter((c) => c.status === "published" && sameYear(c, catalog)))
}

import { ROUTES } from "@/constants/routes"

/**
 * RM-5 (2026-11-26) — the company-admin pages that are one page with tabs,
 * modelled on the super-admin hubs (`src/pages/super-admin/house/hubs.ts`).
 *
 * Every tab is an existing route, so:
 *   - every address that works today keeps working and opens its own tab;
 *   - no route is added, removed or redirected;
 *   - only the open tab's page loads its data, exactly as visiting it does today.
 *
 * Shown only with the `company-admin` house switch on. Display only: nothing
 * here decides what a company admin may open.
 *
 * Copy is translated in the `companyAdminPages` namespace; the English text is
 * also the default, so a missing key still reads correctly.
 */

export type CompanyAdminHubTab = {
  key: string
  /** Translation key and English default for the tab label. */
  labelKey: string
  label: string
  /** Where the tab goes when it is not the open one. */
  to: string
  /** One plain sentence shown under the tabs while this tab is open. */
  descriptionKey: string
  description: string
  /**
   * Shown only when the org's cohort read-out switch is on (N-3), the same
   * rule the menu row followed before RM-5.
   */
  cohortGated?: boolean
}

export type CompanyAdminHubDef = {
  key: "people" | "organization" | "analytics"
  titleKey: string
  title: string
  descriptionKey: string
  description: string
  tabs: readonly CompanyAdminHubTab[]
}

export const PEOPLE_HUB: CompanyAdminHubDef = {
  key: "people",
  titleKey: "peopleTitle",
  title: "People",
  descriptionKey: "hubPeopleDescription",
  description: "The people in your organization, and the ways to add more.",
  tabs: [
    {
      key: "people",
      labelKey: "hubPeopleTabPeople",
      label: "People",
      to: ROUTES.COMPANY_ADMIN.USERS,
      descriptionKey: "peopleDescription",
      description: "Everyone in your organization who uses InspiresGenius.",
    },
    {
      key: "bulk-import",
      labelKey: "hubPeopleTabBulkImport",
      label: "Bulk import",
      to: ROUTES.COMPANY_ADMIN.BULK_IMPORT,
      descriptionKey: "hubPeopleTabBulkImportDescription",
      description: "Import a file of people and send them invitations.",
    },
  ],
}

export const ORGANIZATION_HUB: CompanyAdminHubDef = {
  key: "organization",
  titleKey: "orgHouseTitle",
  title: "Organization",
  descriptionKey: "hubOrganizationDescription",
  description: "Your organization's departments and the documents that describe its culture.",
  tabs: [
    {
      key: "organization",
      labelKey: "hubOrganizationTabOrganization",
      label: "Organization",
      to: ROUTES.COMPANY_ADMIN.ORGANIZATION,
      descriptionKey: "orgHouseDescription",
      description: "Your organization's departments, as recorded in InspiresGenius.",
    },
    {
      key: "culture",
      labelKey: "hubOrganizationTabCulture",
      label: "Culture Docs",
      to: ROUTES.COMPANY_ADMIN.CULTURE,
      descriptionKey: "hubOrganizationTabCultureDescription",
      description: "Documents about your organization's culture and values.",
    },
  ],
}

export const ANALYTICS_HUB: CompanyAdminHubDef = {
  key: "analytics",
  titleKey: "hubAnalyticsTitle",
  title: "Analytics",
  descriptionKey: "hubAnalyticsDescription",
  description: "How your organization uses InspiresGenius, and what the AI coaches do and cost.",
  tabs: [
    {
      key: "analytics",
      labelKey: "hubAnalyticsTabAnalytics",
      label: "Analytics",
      to: ROUTES.COMPANY_ADMIN.ANALYTICS,
      descriptionKey: "analyticsSubtitle",
      description: "Organization-level engagement, training, and cost metrics.",
    },
    {
      key: "observability",
      labelKey: "hubAnalyticsTabObservability",
      label: "AI Observability",
      to: ROUTES.COMPANY_ADMIN.OBSERVABILITY,
      descriptionKey: "observabilitySubtitle",
      description: "Agent performance and cost metrics for your organization",
    },
    {
      key: "cohort-readout",
      labelKey: "hubAnalyticsTabCohort",
      label: "Cohort Read-out",
      to: ROUTES.COMPANY_ADMIN.COHORT_READOUT,
      descriptionKey: "cohortIntroOwn",
      description: "Your organisation at a glance — counts and percentages only, never an individual's result.",
      cohortGated: true,
    },
  ],
}

export const COMPANY_ADMIN_HUBS: readonly CompanyAdminHubDef[] = [PEOPLE_HUB, ORGANIZATION_HUB, ANALYTICS_HUB]

/**
 * The tabs to show. A cohort-gated tab appears only when the org's switch is
 * on (`true`); while the status read is loading, has failed or says false, it
 * is left out — the same rule the menu row followed.
 */
export function visibleHubTabs(hub: CompanyAdminHubDef, cohortOn: boolean): CompanyAdminHubTab[] {
  return hub.tabs.filter((t) => !t.cohortGated || cohortOn)
}

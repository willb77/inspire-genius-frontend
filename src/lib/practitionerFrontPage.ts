import { ROUTES } from "@/constants/routes"

/**
 * RM-6 B (CSA #2236): where the Studio is the practitioner's front page,
 * `/practitioner/home` forwards a practitioner to it. This query opens Home
 * itself instead; the Studio header's "Practice overview" link uses it.
 */
export const PRACTICE_OVERVIEW_PARAM = { key: "view", value: "overview" } as const

export const PRACTICE_OVERVIEW_PATH = `${ROUTES.PRACTITIONER.HOME}?${PRACTICE_OVERVIEW_PARAM.key}=${PRACTICE_OVERVIEW_PARAM.value}`

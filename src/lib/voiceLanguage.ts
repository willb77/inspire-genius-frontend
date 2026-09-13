/**
 * The UI language to send with a TTS request.
 *
 * The server speaks non-English turns with a native Google Chirp 3 HD voice
 * and keeps English on OpenAI, but it can only do that if it is told which
 * language the user is reading. This is the single place that answers that.
 *
 * WHY NOT `import i18n from "@/lib/i18n"`
 * ---------------------------------------
 * Importing the i18next instance runs `i18n.init()` as a module side effect,
 * pulling in HttpBackend and the language detector. The voice hooks are used
 * by a lot of tests that have no i18n setup and no `/locales` to fetch from,
 * so importing it there would start network requests inside jsdom in suites
 * that have nothing to do with translation.
 *
 * Instead this reads exactly what i18next itself reads. `src/lib/i18n.ts`
 * configures the detector as:
 *
 *     order: ['localStorage', 'navigator']
 *     lookupLocalStorage: 'i18nextLng'
 *     caches: ['localStorage']
 *
 * so the localStorage key IS i18next's resolved choice — it writes the key on
 * every language change — and `navigator.language` is its own next fallback.
 * Mirroring that order gives the same answer without the init.
 *
 * If the detector config in `i18n.ts` ever changes, this must change with it;
 * `__tests__/voiceLanguage.test.ts` pins the key name so the two cannot drift
 * silently.
 */

/** The key i18next-browser-languagedetector caches the active language under. */
export const I18N_STORAGE_KEY = "i18nextLng"

/**
 * The caller's language tag, or `undefined` when it cannot be determined.
 *
 * `undefined` is meaningful rather than a failure: the server treats a missing
 * `language` as "behave exactly as before", which is English on OpenAI. So a
 * private window with no storage access degrades to today's behaviour instead
 * of erroring.
 */
export function ttsLanguage(): string | undefined {
  // localStorage access throws outright in some embedded/privacy contexts,
  // not merely returns null, so the read has to be guarded rather than
  // null-checked.
  try {
    const stored = window.localStorage.getItem(I18N_STORAGE_KEY)
    if (stored && stored.trim()) return stored.trim()
  } catch {
    // fall through to navigator
  }

  try {
    const nav = window.navigator?.language
    if (nav && nav.trim()) return nav.trim()
  } catch {
    // fall through to undefined
  }

  return undefined
}

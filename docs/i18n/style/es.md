# Style guide: Spanish (es)

> DRAFT. A native Spanish-speaking reviewer must confirm this file before it is relied on.

Scope: UI strings, toasts and the three launch emails (magic link, forgot password, admin invite). PRISM canon and report text are not translated (owner decision). Agent and product names stay as listed in `scripts/i18n/glossary.json` under `do_not_translate`.

## Register
- Informal singular **tu** (second person singular, "tú"). Matches what ships today: "¿No tienes cuenta?", "Cerrar sesión".
- Verbs in the tu imperative or the infinitive for buttons ("Guardar", "Buscar"). Avoid "usted" and "vosotros"; no region-specific slang. Prefer neutral vocabulary that reads naturally in both Spain and Latin America; the reviewer decides whether to target a specific region.
- Open questions and exclamations with the inverted mark: "¿...?", "¡...!".

## Numbers and dates
- Decimal comma, thousands separated by a space or a dot (reviewer to choose one; use Intl formatting, never hand-typed). 1.234,5 via `Intl.NumberFormat("es")`.
- Dates day/month/year, 24-hour clock: 15/11/2026, 14:30. Month names lower case: "15 de noviembre de 2026".

## Examples from existing keys (public/locales)
| Key | en | es |
|---|---|---|
| common.save | Save | Guardar |
| common.noAccount | Don't have an account? | ¿No tienes cuenta? |
| common.loading | Loading... | Cargando... |

## Reviewer checklist
- Confirm tu vs usted for a coaching product.
- Confirm neutral vs Spain-specific vocabulary.
- Confirm number grouping convention.

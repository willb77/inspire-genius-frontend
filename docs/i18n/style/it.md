# Style guide: Italian (it)

> DRAFT. A native Italian reviewer must confirm this file before it is relied on.

Scope: UI strings, toasts and the three launch emails (magic link, forgot password, admin invite). PRISM canon and report text are not translated (owner decision). Agent and product names stay as in `scripts/i18n/glossary.json` (`do_not_translate`). Note: roughly 270 of the 615 existing `it` keys are English placeholders today, so this guide governs the first real translation of them.

## Register
- Shipped strings use informal **tu** ("Non hai un account?"). Keep **tu** for UI and emails. The formal **Lei** (capital L, third-person singular: "Ha un account?", "Inserisca la password") is the alternative; the owner or reviewer must confirm tu vs Lei for a coaching product before volume translation starts.
- Buttons use the second-person imperative or short verbs ("Salva", "Cerca", "Esci"), consistently with the shipped set.

## Numbers and dates
- Decimal comma, thousands separated by a dot: 1.234,5 (use `Intl.NumberFormat("it")`; four-digit numbers may omit the separator).
- Dates day/month/year, 24-hour clock: 15/11/2026, 14:30. Month names lower case: "15 novembre 2026".

## Examples from existing keys (public/locales)
| Key | en | it |
|---|---|---|
| common.save | Save | Salva |
| common.noAccount | Don't have an account? | Non hai un account? |
| common.loading | Loading... | Caricamento... |

## Reviewer checklist
- Decide tu vs Lei (shipped: tu).
- Confirm which anglicisms stay ("account", "email", "Home").

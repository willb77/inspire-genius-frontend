# Style guide: French (fr)

> DRAFT. A native French-speaking reviewer must confirm this file before it is relied on.

Scope: UI strings, toasts and the three launch emails (magic link, forgot password, admin invite). PRISM canon and report text are not translated (owner decision). Agent and product names stay as in `scripts/i18n/glossary.json` (`do_not_translate`).

## Register
- Shipped strings use **vous** ("Vous n'avez pas de compte?"). Keep **vous** throughout, including emails and error messages; do not mix in **tu**.
- Buttons use the infinitive or a noun ("Enregistrer", "Rechercher"), not the imperative.
- Typography: a non-breaking space before `?`, `!`, `:` and `;`, and guillemets with inner spaces for quotes: « texte ». Note: the shipped strings omit the space before `?`; the reviewer should decide whether to normalise.

## Numbers and dates
- Decimal comma, thousands separated by a narrow no-break space: 1 234,5 (use `Intl.NumberFormat("fr")`).
- Dates day/month/year, 24-hour clock with "h" in prose: 15/11/2026, 14 h 30. Month names lower case: "15 novembre 2026".

## Examples from existing keys (public/locales)
| Key | en | fr |
|---|---|---|
| common.save | Save | Enregistrer |
| common.noAccount | Don't have an account? | Vous n'avez pas de compte? |
| common.loading | Loading... | Chargement... |

## Reviewer checklist
- Confirm vous throughout.
- Decide on the space before `?` `!` `:` and on the ellipsis character.
- Confirm France vs Canada conventions (default assumed: France).

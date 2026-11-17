# Style guide: Czech (cs)

> DRAFT. A native Czech reviewer must confirm this file before it is relied on. Every Czech string below was written by the drafter, not taken from the repo.

Scope: UI strings, toasts and the three launch emails (magic link, forgot password, admin invite). PRISM canon and report text are not translated (owner decision). Agent and product names stay as in `scripts/i18n/glossary.json` (`do_not_translate`). Note: the `cs` locale files are English copies today (610 of 615 keys identical to English), so nothing shipped constrains the register yet.

## Register
- **DECIDED by the owner, 2026-11-17 01:26 EST (typed in the Coordinator's terminal): formal vy.** Czech distinguishes informal **ty** (imperative "Zadej", "Ulož") and formal **vy** (imperative "Zadejte", "Uložte", verbs in the 2nd person plural). Use the vykání forms; capital "Vy" only in direct personal letters (not in UI). Example: "Nemáte účet?" (formal), never "Nemáš účet?" (informal).
- Buttons: imperative in the vy form ("Uložit" as infinitive is also standard on buttons; pick one and keep it).

## Numbers and dates
- Decimal comma, thousands separated by a no-break space: 1 234,5 (use `Intl.NumberFormat("cs")`).
- Dates day. month. year with spaces after the dots, 24-hour clock: 15. 11. 2026, 14:30. Month names in the genitive in prose: "15. listopadu 2026".
- Plural forms: Czech has one, few, many and other; i18next plural keys must supply them.

## Examples (proposed, not yet in the repo; cs currently ships English)
| Key | en | cs (proposed) |
|---|---|---|
| common.save | Save | Uložit |
| common.noAccount | Don't have an account? | Nemáte účet? |
| common.loading | Loading... | Načítání... |

## Reviewer checklist
- vy is decided (see Register); check that no ty form slipped into any string.
- Confirm the three proposed examples and the infinitive button convention.
- Check plural categories on every counted string.

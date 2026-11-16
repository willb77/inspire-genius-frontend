# Style guide: Polish (pl)

> DRAFT. A native Polish reviewer must confirm this file before it is relied on.

Scope: UI strings, toasts and the three launch emails (magic link, forgot password, admin invite). PRISM canon and report text are not translated (owner decision). Agent and product names stay as in `scripts/i18n/glossary.json` (`do_not_translate`). Note: roughly 264 of the 615 existing `pl` keys are English placeholders today, so this guide governs the first real translation of them.

## Register
- Polish has no single formal pronoun. The shipped strings address the user in the **second person singular informal** ("Nie masz konta?"). The formal alternative is **Pan/Pani** with third-person verbs ("Czy ma Pan/Pani konto?"), usually avoided in app UI by using impersonal or infinitive phrasing ("Zaloguj się" is informal imperative; "Logowanie" is neutral). The owner or reviewer must choose: informal second person (shipped), or neutral/impersonal wording that avoids both. Do not mix.
- Buttons use the imperative second person or a noun ("Zapisz", "Szukaj", "Wyloguj").
- Gender: avoid forms that force the user's gender where a neutral wording exists.

## Numbers and dates
- Decimal comma, thousands separated by a no-break space: 1 234,5 (use `Intl.NumberFormat("pl")`).
- Dates day.month.year with dots, 24-hour clock: 15.11.2026, 14:30. Month names in the genitive, lower case: "15 listopada 2026".
- Plural forms: Polish has three categories (one, few, many) plus other. i18next plural keys must supply them; do not reuse the English one/other pair.

## Examples from existing keys (public/locales)
| Key | en | pl |
|---|---|---|
| common.save | Save | Zapisz |
| common.noAccount | Don't have an account? | Nie masz konta? |
| common.loading | Loading... | Ładowanie... |

## Reviewer checklist
- Choose informal second person vs impersonal wording for the whole product.
- Check plural categories (one/few/many/other) on every counted string.

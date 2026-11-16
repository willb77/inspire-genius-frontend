# Style guide: Portuguese, Brazil (pt)

> DRAFT. A native Brazilian Portuguese reviewer must confirm this file before it is relied on.

The language code stays `pt` (owner decision); the UI label is "Português (Brasil)". Every string is Brazilian Portuguese, never European.

Scope: UI strings, toasts and the three launch emails (magic link, forgot password, admin invite). PRISM canon and report text are not translated (owner decision). Agent and product names stay as in `scripts/i18n/glossary.json` (`do_not_translate`).

## Register
- **você** with third-person verb forms ("Não tem uma conta?"), as shipped today. Do not use **tu** forms. No **o senhor/a senhora**.
- Buttons use the infinitive ("Salvar", "Pesquisar", "Sair").

## Brazilian spellings and vocabulary (pt only)
- Post-2009 orthographic agreement, Brazilian forms: "ação", "ótimo", "contato" (not "contacto"), "equipe" (not "equipa"), "tela" (not "ecrã"), "arquivo" (not "ficheiro"), "salvar" (not "guardar"), "baixar" for download, "e-mail", "usuário" (not "utilizador"), "celular" (not "telemóvel"), "configurações" (not "definições"), "carregando" (not "a carregar": no "a + infinitive" progressive).
- Gerund for progressives: "Entrando...", "Enviando...".

## Numbers and dates
- Decimal comma, thousands separated by a dot: 1.234,5 (use `Intl.NumberFormat("pt-BR")`).
- Dates day/month/year, 24-hour clock: 15/11/2026, 14:30. Month names lower case: "15 de novembro de 2026".

## Examples from existing keys (public/locales)
| Key | en | pt |
|---|---|---|
| common.save | Save | Salvar |
| common.noAccount | Don't have an account? | Não tem uma conta? |
| common.loading | Loading... | Carregando... |

## Reviewer checklist
- Confirm você-only register.
- Confirm the Brazilian vocabulary list above.

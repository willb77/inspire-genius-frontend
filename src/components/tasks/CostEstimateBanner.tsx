import { useTranslation } from "react-i18next"
/**
 * Pre-submit cost estimate (Combined Plan §A.E3.4).
 *
 * Static placeholder — multiplies the rough prompt-token count by the dev-tier
 * Sonnet pricing ($3 / 1M input tokens). Real cost ledger integration is a
 * separate follow-up (see services/agent-engine/app/analytics/).
 */
interface Props {
  promptText: string
}

const DEV_INPUT_PRICE_PER_MTOK = 3 // USD per million Sonnet input tokens

function estimateTokens(text: string): number {
  // Rough heuristic — 4 characters per token on average.
  return Math.ceil(text.length / 4)
}

export default function CostEstimateBanner({ promptText }: Props) {
  const { t } = useTranslation("studioUi")
  const tokens = estimateTokens(promptText)
  const usd = (tokens / 1_000_000) * DEV_INPUT_PRICE_PER_MTOK
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      {t("tasks.costEstimateBanner.estimatedCostUsdInputTokens", { defaultValue: "Estimated cost: ~${{v1}} USD ({{v2}} input tokens × Sonnet input rate). Output cost depends on the agent's response length.", v1: usd.toFixed(4), v2: tokens.toLocaleString() })}
    </div>
  )
}

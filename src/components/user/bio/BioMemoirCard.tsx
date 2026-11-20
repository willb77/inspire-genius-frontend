/**
 * "Your memoir" card — sits at the foot of the Chronicle insight rail so the
 * output of the interview is next to the interview, not in the page header.
 * Presentational: the export menu owns Copy / Print / Word / PDF.
 */
import { BookText } from "lucide-react"
import { useTranslation } from "react-i18next"
import MemoirExportMenu from "@/components/user/bio/MemoirExportMenu"
import type { MemberNarrative } from "@/types/bio"

export type BioMemoirCardProps = {
  memberId: string
  narrative: MemberNarrative
}

export function BioMemoirCard({ memberId, narrative }: BioMemoirCardProps) {
  const { t } = useTranslation("studioUi")
  return (
    <section
      aria-label={t("user.bioMemoirCard.title", { defaultValue: "Your memoir" })}
      className="space-y-2"
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <BookText className="h-3.5 w-3.5" aria-hidden />
        {t("user.bioMemoirCard.title", { defaultValue: "Your memoir" })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {t("user.bioMemoirCard.body", {
          defaultValue: "Turn what you have captured into a document you can keep or share.",
        })}
      </p>
      <MemoirExportMenu memberId={memberId} narrative={narrative} />
    </section>
  )
}

export default BioMemoirCard

import StudioImportCsvButton from "@/components/prism/studio/ImportCsvButton"
import type { ImportPort } from "@/components/prism/studio/ports"
import { CHARACTER_LAB_IMPORT_COPY } from "./copy"
import { useImportProfileCsv } from "@/hooks/super-admin/useCharacterLab"

/**
 * Character Lab's binding of the shared CSV importer.
 *
 * The only place that knows the import writes to `/v1/agents/character-lab`.
 * There is deliberately no real-person equivalent yet: importing a wide CSV as
 * a subject would write a profile nothing else in the platform can vouch for.
 */
export default function ImportCsvButton() {
  const importCsv = useImportProfileCsv()

  const port: ImportPort = {
    importCsv: { run: (body) => importCsv.mutateAsync(body), pending: importCsv.isPending },
  }

  return <StudioImportCsvButton port={port} copy={CHARACTER_LAB_IMPORT_COPY} />
}

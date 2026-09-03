import StudioComparePanel from "@/components/prism/studio/ComparePanel"
import type { ComparePort } from "@/components/prism/studio/ports"
import { CHARACTER_LAB_COMPARE_COPY } from "./copy"
import {
  useAskAboutProfiles,
  useCompareProfiles,
  useSavedProfiles,
  useStarterQuestions,
} from "@/hooks/super-admin/useCharacterLab"

/**
 * Character Lab's binding of the shared compare panel.
 *
 * This file is the ONLY thing that knows the comparison runs against
 * `/v1/agents/character-lab`. The panel itself takes a port and some words; it
 * has no hook, no service and no axios instance of its own, so a manager
 * surface reusing it cannot reach a super-admin endpoint by forgetting a prop.
 *
 * Character Lab compares by saved-profile id. Team Studio sends whole subjects.
 * Translating between the panel's `(ids, part)` and each backend's request body
 * is this adapter's whole job.
 */
export default function ComparePanel() {
  const { data: profiles, isLoading } = useSavedProfiles()
  const compare = useCompareProfiles()
  const questions = useStarterQuestions()
  const ask = useAskAboutProfiles()

  const port: ComparePort = {
    cast: { subjects: profiles, isLoading },
    compare: {
      run: (profile_ids, part) => compare.mutateAsync({ profile_ids, part }),
      pending: compare.isPending,
    },
    questions: {
      run: (profile_ids) => questions.mutateAsync({ profile_ids }),
      pending: questions.isPending,
    },
    ask: {
      run: (profile_ids, question) => ask.mutateAsync({ profile_ids, question }),
      pending: ask.isPending,
    },
  }

  return <StudioComparePanel port={port} copy={CHARACTER_LAB_COMPARE_COPY} />
}

import StudioProfileLibrary from "@/components/prism/studio/ProfileLibrary"
import type { LibraryPort } from "@/components/prism/studio/ports"
import { CHARACTER_LAB_LIBRARY_COPY } from "./copy"
import {
  useDeleteProfile,
  usePatchProfile,
  useSavedProfiles,
} from "@/hooks/super-admin/useCharacterLab"

/**
 * Character Lab's binding of the shared recall list.
 *
 * The only place that knows the list comes from `/v1/agents/character-lab`.
 * The panel itself is given the rows and the words.
 */
export default function ProfileLibrary({
  onLoad,
  loadingId,
}: {
  onLoad: (id: string) => void
  loadingId: string | null
}) {
  const { data: profiles, isLoading, error } = useSavedProfiles()
  const patch = usePatchProfile()
  const remove = useDeleteProfile()

  const port: LibraryPort = {
    list: { subjects: profiles, isLoading, error },
    patch: {
      run: (id, patchBody) => patch.mutateAsync({ id, patch: patchBody }),
      pending: patch.isPending,
    },
    remove: { run: (id) => remove.mutateAsync(id), pending: remove.isPending },
  }

  return (
    <StudioProfileLibrary
      port={port}
      copy={CHARACTER_LAB_LIBRARY_COPY}
      onLoad={onLoad}
      loadingId={loadingId}
    />
  )
}

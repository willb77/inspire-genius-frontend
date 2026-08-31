/**
 * useProfileMaterial — the user's uploaded profile documents, for the links
 * under "Latest report" on Home.
 *
 * `useMyProfile().personal_docs` only reports which *kinds* exist (resume, bio,
 * …). It carries no document IDs, so it cannot produce a link to open anything.
 * This hook lists the real documents so each one can be opened in a viewer.
 *
 * The PRISM report is deliberately excluded: it already has its own line and
 * its own "View PRISM Report" button, and listing it twice would imply the
 * user had uploaded two different things.
 */

import { useQuery } from "@tanstack/react-query";
import {
  listDocumentsV2,
  type DocumentOut,
} from "@/services/documents/documentService";

/** Doc kinds that count as profile material, in display order. */
const PROFILE_DOC_KINDS = ["resume", "cv", "bio", "personal"] as const;

/** Friendly label per kind; unknown kinds fall back to the filename. */
const KIND_LABEL: Record<string, string> = {
  resume: "Resume",
  cv: "Resume",
  bio: "Bio",
  personal: "Additional Info",
};

export interface ProfileMaterialDoc {
  id: string;
  /** Group label ("Resume"), not the raw filename. */
  label: string;
  fileName: string;
  contentType: string;
  uploadedAt: string;
}

function toMaterial(d: DocumentOut): ProfileMaterialDoc {
  const kind = (d.doc_kind ?? "").toLowerCase();
  return {
    id: d.id,
    label: KIND_LABEL[kind] ?? d.filename,
    fileName: d.filename,
    contentType: d.content_type,
    uploadedAt: d.created_at,
  };
}

/**
 * Lists profile material newest-first. Returns `[]` rather than throwing when
 * the documents API is unavailable — a failure here must not take out Home,
 * which is why the caller renders nothing instead of an error state.
 */
export function useProfileMaterial(): {
  data: ProfileMaterialDoc[];
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["profile-material"],
    queryFn: async (): Promise<ProfileMaterialDoc[]> => {
      const results = await Promise.all(
        PROFILE_DOC_KINDS.map(async (kind) => {
          try {
            const res = await listDocumentsV2({ doc_kind: kind, limit: 10 });
            return res.documents ?? [];
          } catch {
            // One missing kind must not blank the whole list.
            return [] as DocumentOut[];
          }
        }),
      );

      // A document tagged both `resume` and `cv` would otherwise appear twice.
      const seen = new Set<string>();
      return results
        .flat()
        .filter((d) => {
          if (!d?.id || seen.has(d.id)) return false;
          seen.add(d.id);
          return true;
        })
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
        .map(toMaterial);
    },
    staleTime: 60_000,
    retry: false,
  });

  return { data: data ?? [], isLoading };
}

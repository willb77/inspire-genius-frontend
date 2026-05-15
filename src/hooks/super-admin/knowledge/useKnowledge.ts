import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listKnowledgeDocuments,
  uploadKnowledgeDocument,
  deleteKnowledgeDocument,
  revectorizeDocument,
  type KnowledgeListParams,
  type KnowledgeUploadRequest,
} from '@/services/super-admin/knowledge/knowledge.service'
import { toast } from 'sonner'

const QK = {
  all: ['knowledge-documents'] as const,
  list: (params: KnowledgeListParams) => ['knowledge-documents', params] as const,
}

export function useKnowledgeDocuments(params: KnowledgeListParams = {}) {
  return useQuery({
    queryKey: QK.list(params),
    queryFn: () => listKnowledgeDocuments(params),
    staleTime: 30_000,
  })
}

export function useUploadKnowledge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: KnowledgeUploadRequest) => uploadKnowledgeDocument(request),
    onSuccess: (result) => {
      toast.success(
        `Ingested ${result.documents_processed} document(s) — ${result.total_stored} chunks stored`,
      )
      queryClient.invalidateQueries({ queryKey: QK.all })
    },
    onError: () => {
      toast.error('Failed to upload knowledge document.')
    },
  })
}

export function useDeleteKnowledge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (docId: string) => deleteKnowledgeDocument(docId),
    onSuccess: (result) => {
      toast.success(result.message)
      queryClient.invalidateQueries({ queryKey: QK.all })
    },
    onError: () => {
      toast.error('Failed to delete document.')
    },
  })
}

export function useRevectorize() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (docId: string) => revectorizeDocument(docId),
    onSuccess: (result) => {
      toast.success(result.message)
      queryClient.invalidateQueries({ queryKey: QK.all })
    },
    onError: () => {
      toast.error('Failed to re-vectorize document.')
    },
  })
}

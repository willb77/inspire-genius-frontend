import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listPrism,
  getPrism,
  createPrism,
  updatePrism,
  deletePrism,
  type PrismCreateRequest,
  type PrismListParams,
  type PrismUpdateRequest,
} from "@/services/super-admin/prism/prism.service";
import { toast } from "sonner";

const QK = {
  all: ["prism"] as const,
  list: (params: PrismListParams) => ["prism", params] as const,
  byId: (id: string) => ["prism", "id", id] as const,
};

export function usePrismList(params: PrismListParams = {}) {
  return useQuery({
    queryKey: QK.list(params),
    queryFn: () => listPrism(params),
    staleTime: 30_000,
  });
}

export function usePrismById(rowId: string | undefined) {
  return useQuery({
    queryKey: QK.byId(rowId ?? ""),
    queryFn: () => getPrism(rowId!),
    enabled: !!rowId,
  });
}

export function useCreatePrism() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PrismCreateRequest) => createPrism(body),
    onSuccess: () => {
      toast.success("PRISM row created.");
      qc.invalidateQueries({ queryKey: QK.all });
    },
    onError: () => toast.error("Failed to create PRISM row."),
  });
}

export function useUpdatePrism() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PrismUpdateRequest }) =>
      updatePrism(id, body),
    onSuccess: () => {
      toast.success("PRISM row updated. Re-vectorizing in background.");
      qc.invalidateQueries({ queryKey: QK.all });
    },
    onError: () => toast.error("Failed to update PRISM row."),
  });
}

export function useDeletePrism() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rowId: string) => deletePrism(rowId),
    onSuccess: () => {
      toast.success("PRISM row deleted.");
      qc.invalidateQueries({ queryKey: QK.all });
    },
    onError: () => toast.error("Failed to delete PRISM row."),
  });
}

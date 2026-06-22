import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listProjects,
  updateProjectInstructions,
  type Project,
} from "@/services/projects/projectsService";

const PROJECTS_KEY = ["projects", "list"] as const;

/**
 * useProjects — Meridian per-project conversation scopes.
 *
 * Backed by the STUBBED projectsService (no backend yet — see that file's
 * header). Once the agent-engine /v1/projects routes ship, only the service
 * changes; this hook layer stays the same.
 */
export function useProjects() {
  return useQuery<Project[]>({
    queryKey: PROJECTS_KEY,
    queryFn: listProjects,
    staleTime: 60_000,
  });
}

export function useUpdateProjectInstructions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      instructions,
    }: {
      projectId: string;
      instructions: string;
    }) => updateProjectInstructions(projectId, instructions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

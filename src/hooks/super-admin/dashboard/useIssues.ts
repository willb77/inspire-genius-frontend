import {
  getIssueById,
  addAdminComment,
  type IssueData,
  type AddAdminCommentRequest,
} from "@/services/super-admin/dashboard/issues.service";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

export function useGetIssueById(
  issue_id?: string
): UseQueryResult<IssueData | undefined, Error> {
  return useQuery<IssueData | undefined, Error>({
    queryKey: ["issue", issue_id],
    queryFn: async () => {
      if (!issue_id) return undefined;
      const response = await getIssueById(issue_id);
      return response.data;
    },
    enabled: !!issue_id,
  });
}

export function useAddAdminComment(): UseMutationResult<
  any,
  Error,
  { issue_id: string } & AddAdminCommentRequest,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      issue_id,
      comment,
      change_status,
    }: {
      issue_id: string;
      comment: string;
      change_status?: string;
    }) => {
      const payload: AddAdminCommentRequest = { comment };
      if (change_status) payload.change_status = change_status;

      return await addAdminComment(issue_id, payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["issue", variables.issue_id],
      });

      queryClient.invalidateQueries({
        queryKey: ["issues"],
      });
    },
  });
}

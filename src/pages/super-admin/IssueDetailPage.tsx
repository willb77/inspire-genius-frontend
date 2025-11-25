"use client";

import { useForm, Controller } from "react-hook-form";

import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  User,
  Calendar,
  ChevronLeft,
  MessageSquare,
  Clock,
  FileText,
  Send,
  CheckCircle2,
} from "lucide-react";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { toast } from "sonner";
import {
  useAddAdminComment,
  useGetIssueById,
} from "@/hooks/super-admin/dashboard/useIssues";
import { Label } from "@/components/ui/label";
import {
  ISSUE_DETAIL_RULES,
  ISSUE_DETAIL_DEFAULTS,
  type IssueDetailFormValues,
  ISSUE_STATUSES,
  getStatusColor,
  getPriorityColor,
} from "@/components/shared/forms/IssueDetailPage.constants";

type IssueComment = {
  text?: string;
  comment?: string;
  created_at?: string;
};

export default function IssueDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const issue_id = params?.id as string;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IssueDetailFormValues>({
    mode: "onChange",
    defaultValues: ISSUE_DETAIL_DEFAULTS,
  });

  const { data: issue, isPending, isError } = useGetIssueById(issue_id);
  const addCommentMutation = useAddAdminComment();

  const formatStatus = (status: string) => status.replace(/_/g, " ");

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const onSubmit = async (values: { comment: string; status: string }) => {
    try {
      const response = await addCommentMutation.mutateAsync({
        issue_id,
        comment: (values.comment ?? "").trim(),
        change_status: values.status || undefined,
      });

      const successMessage = response?.message || "Comment added successfully";

      toast.success(successMessage);
      reset();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to add comment";
      toast.error(errorMessage);
    }
  };

  if (isPending) {
    return (
      <SuperAdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-6 w-48" />
              </div>
            </CardContent>
          </Card>
        </div>
      </SuperAdminLayout>
    );
  }

  if (isError || !issue) {
    return (
      <SuperAdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600">Failed to load issue details</p>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-2 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-left">
              Issue Details
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              View and manage issue #{issue.id.slice(0, 8)}
            </p>
          </div>
        </div>

        <Card className="bg-white shadow-sm">
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-xl text-left flex items-start gap-2">
                  <AlertCircle className="h-6 w-6 text-gray-600 mt-1 flex-shrink-0" />
                  <span>{issue.subject}</span>
                </CardTitle>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Badge
                  variant="secondary"
                  className={`capitalize ${getStatusColor(issue.status)}`}
                >
                  {formatStatus(issue.status)}
                </Badge>
                <Badge
                  variant="secondary"
                  className={`capitalize ${getPriorityColor(issue.priority)}`}
                >
                  {issue.priority}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </h3>
              <p className="text-gray-700 text-left leading-relaxed bg-gray-50 p-2 rounded-md">
                {issue.description}
              </p>
            </div>

            {/* Issue Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 mb-4  text-left gap-4">
              <div className="flex items-start gap-3 p-1 bg-gray-50 rounded-lg">
                <User className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Reported By
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {issue.reported_by_name}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-1 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Created At
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(issue.created_at)}
                  </p>
                </div>
              </div>

              {issue.issue_type_name && (
                <div className="flex items-start gap-3 p-1 bg-gray-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Issue Type
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {issue.issue_type_name}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-1 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Age</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {issue.age_in_days} days
                  </p>
                </div>
              </div>

              {issue.resolved_at && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-green-700">
                      Resolved At
                    </p>
                    <p className="text-sm font-semibold text-green-900">
                      {formatDate(issue.resolved_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {(issue.comments && issue.comments.length > 0) || true ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comments ({issue.comments?.length || 0})
                  </h3>

                  {issue.comments && issue.comments.length > 0 ? (
                    <div className="space-y-3">
                      {issue.comments.map(
                        (comment: IssueComment, index: number) => (
                          <div
                            key={index}
                            className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                          >
                            <p className="text-sm text-gray-700 text-left">
                              {comment.text || comment.comment}
                            </p>
                            {comment.created_at && (
                              <p className="text-xs text-gray-500 mt-2">
                                {formatDate(comment.created_at)}
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No comments yet.
                    </p>
                  )}
                </div>

                <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Add Admin Comment
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block text-left">
                        Comment
                      </Label>
                      <Textarea
                        placeholder="Enter your comment here..."
                        className="min-h-[100px] resize-none"
                        {...register("comment", ISSUE_DETAIL_RULES.comment)}
                      />
                      {errors.comment?.message && (
                        <p className="mt-1 text-xs text-red-600 text-left">
                          {errors.comment.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block text-left">
                        Change Status (Optional)
                      </Label>
                      <Controller
                        control={control}
                        name="status"
                        rules={ISSUE_DETAIL_RULES.status}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status to change" />
                            </SelectTrigger>
                            <SelectContent>
                              {ISSUE_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status.replace("-", " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.status?.message && (
                        <p className="mt-1 text-xs text-red-600 text-left">
                          {errors.status.message}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={handleSubmit(onSubmit)}
                      disabled={addCommentMutation.isPending || isSubmitting}
                      className="w-full"
                    >
                      {addCommentMutation.isPending ? (
                        <>Submitting...</>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Comment
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}

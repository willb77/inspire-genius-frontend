"use client";

import { useState } from "react";
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
  Building,
  FileText,
  Send,
  CheckCircle2,
} from "lucide-react";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { toast } from "sonner";
import { useAddAdminComment, useGetIssueById } from "@/hooks/super-admin/dashboard/useIssues";

export default function IssueDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const issue_id = params?.id as string;

  const [comment, setComment] = useState("");
  const [changeStatus, setChangeStatus] = useState("");

  const { data: issue, isPending, isError } = useGetIssueById(issue_id);
  const addCommentMutation = useAddAdminComment();

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-yellow-100 text-yellow-700 border-transparent";
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-transparent";
      case "resolved":
      case "closed":
        return "bg-green-100 text-green-700 border-transparent";
      default:
        return "bg-gray-100 text-gray-700 border-transparent";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-700 border-transparent";
      case "high":
        return "bg-orange-100 text-orange-700 border-transparent";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-transparent";
      case "low":
        return "bg-green-100 text-green-700 border-transparent";
      default:
        return "bg-gray-100 text-gray-700 border-transparent";
    }
  };

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

  const handleSubmit = async () => {
    if (!comment.trim() && !changeStatus) {
      toast.error("Please add a comment or select a status");
      return;
    }

    try {
      await addCommentMutation.mutateAsync({
        issue_id,
        comment: comment.trim(),
        change_status: changeStatus || undefined,
      });
      
      toast.success("Comment added successfully");
      setComment("");
      setChangeStatus("");
    } catch (error) {
      toast.error("Failed to add comment");
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
        {/* Header */}
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

        {/* Main Issue Card */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="border-b bg-gray-50">
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
            {/* Description */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 mb-4  text-left">
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

              {issue.organization_id && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Building className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Organization ID
                    </p>
                    <p className="text-sm font-semibold text-gray-900 font-mono">
                      {issue.organization_id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Comments Section */}
            {issue.comments && issue.comments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments ({issue.comments.length})
                </h3>
                <div className="space-y-3">
                  {issue.comments.map((comment: any, index: number) => (
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
                  ))}
                </div>
              </div>
            )}

            {/* Add Comment Section */}
            <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Add Admin Comment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block text-left">
                    Comment
                  </label>
                  <Textarea
                    placeholder="Enter your comment here..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block text-left">
                    Change Status (Optional)
                  </label>
                  <Select value={changeStatus} onValueChange={setChangeStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status to change" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={addCommentMutation.isPending}
                  className="w-full"
                >
                  {addCommentMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Comment
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, User, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useIssues } from "@/hooks/help/useIssues";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import Pagination from "@/components/shared/Pagination";

export default function IssuesDetailsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const page_size = 10;

  const { data, isPending, isError } = useIssues({ page, page_size });

  const issues = data?.data?.items ?? [];
  const pagination = {
    page: data?.data?.page ?? 1,
    page_size: data?.data?.page_size ?? 10,
    total: data?.data?.total ?? 0,
  };

  // ✅ Helper styles and formatters
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
    });
  };

  const handleIssueClick = (issueId: string) => {
    navigate(`/super-admin/issues/${issueId}`);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-left">
                Help & Support Issues
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                View and manage all support tickets
              </p>
            </div>
          </div>
        </div>

        {/* Issues List */}
        <Card className="bg-white shadow-sm">
          <CardContent>
            {/* Loading State */}
            {isPending ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-5 w-48" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </Card>
                ))}
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-600">
                  Failed to load issues. Please try again later.
                </p>
              </div>
            ) : issues.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                No issues found
              </div>
            ) : (
              <div className="space-y-3">
                {issues.map((issue) => (
                  <Card
                    key={issue.id}
                    className="p-4 border hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                    onClick={() => handleIssueClick(issue.id)}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                            <h3 className="font-semibold text-lg text-gray-900 text-left group-hover:text-blue-600 transition-colors">
                              {issue.subject}
                            </h3>
                          </div>
                        </div>

                        <div className="flex gap-2 items-center flex-shrink-0">
                          <Badge
                            variant="secondary"
                            className={`capitalize ${getStatusColor(
                              issue.status
                            )}`}
                          >
                            {formatStatus(issue.status)}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={`capitalize ${getPriorityColor(
                              issue.priority
                            )}`}
                          >
                            {issue.priority}
                          </Badge>
                          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 text-left pl-7 line-clamp-2">
                        {issue.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pl-7">
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          <span>Reported by: {issue.reported_by_name}</span>
                        </div>
                        {issue.created_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(issue.created_at)}</span>
                          </div>
                        )}
                        {issue.issue_type_name && (
                          <div className="flex items-center gap-1">
                            <span className="text-blue-600 font-medium">
                              {issue.issue_type_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {!isPending && !isError && issues.length > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground mt-6 pt-4 border-t">
                <div>
                  Show{" "}
                  {issues.length > 0
                    ? (pagination.page - 1) * pagination.page_size + 1
                    : 0}{" "}
                  to{" "}
                  {Math.min(
                    pagination.page * pagination.page_size,
                    pagination.total
                  )}{" "}
                  of {pagination.total} results
                </div>
                <Pagination
                  pageCount={Math.max(
                    1,
                    Math.ceil(pagination.total / pagination.page_size)
                  )}
                  page={page}
                  onPageChange={setPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
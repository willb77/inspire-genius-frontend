import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIssues } from "@/hooks/help/useIssues";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function HelpAndSupport() {

  const navigate = useNavigate();
  // Fetch recent issues - show first 5 issues for dashboard view
  const { data: issuesData, isPending, isError } = useIssues({ page: 1, page_size: 3 });
  
  const issues = issuesData?.data?.items ?? [];
  return (
    <div className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Help & Support</CardTitle>
        <Button
          variant={"link"}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          onClick={() => navigate("/super-admin/dashboard/issues")}
        >
          View all
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isPending ? (
          // Loading skeleton
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <Skeleton className="h-4 w-40" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
                <Skeleton className="mt-2 h-10 w-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-sm text-red-600 text-center py-4">
            Failed to load issues. Please try again later.
          </div>
        ) : issues.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No recent issues found.
          </div>
        ) : (
          issues.map((issue) => (
            <Card key={issue.id} className="p-4 shadow-none border-none">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900">
                    {issue.subject}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 text-left line-clamp-2">
                    {issue.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>By: {issue.reported_by_name}</span>
                    {/* <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                    {issue.issue_type_name && (
                      <span className="text-blue-600">{issue.issue_type_name}</span>
                    )} */}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Badge
                    variant="secondary"
                    className={`capitalize ${
                      issue.status === "open"
                        ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                        : issue.status === "in-progress"
                        ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                        : "bg-green-100 text-green-800 hover:bg-green-100"
                    }`}
                  >
                    {issue.status}
                  </Badge>
                  <Badge
                    variant={
                      issue.priority === "critical"
                        ? "destructive"
                        : issue.priority === "high"
                        ? "default"
                        : "secondary"
                    }
                    className="capitalize"
                  >
                    {issue.priority}
                  </Badge>
                </div>
              </div>
            </Card>
          ))
        )}
      </CardContent>
    </div>
  );
}

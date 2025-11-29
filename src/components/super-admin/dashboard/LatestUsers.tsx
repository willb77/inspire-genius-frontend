"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUserManagement } from "@/hooks/super-admin/user-management/useUserManagement";
import type { UserManagementUser } from "@/services/super-admin/user-management/user-management.service";

export default function LatestUsers() {
  const navigate = useNavigate();
  const { data: usersResp, isLoading } = useUserManagement({ page: 1, limit: 5 });

  const users = useMemo<UserManagementUser[]>(() => {
    return usersResp?.data?.users ?? [];
  }, [usersResp]);

  const getBadgeStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === "accepted") return "bg-green-100 text-green-700 border-transparent";
    if (s === "invitation_sent") return "bg-yellow-100 text-yellow-700 border-transparent";
    if (s === "expired") return "bg-red-100 text-red-700 border-transparent";
    return "bg-gray-200 text-gray-700 border-transparent";
  };

  const labelMap: Record<string, string> = {
    accepted: "Accepted",
    invitation_sent: "Invitation Sent",
    expired: "Expired",
  };

  return (
    <div className="w-full p-4">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Latest Users</CardTitle>
        <Button
          variant="link"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          onClick={() => navigate("/super-admin/users")}
        >
          View all
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <>
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="border rounded-lg p-4"
              >
                <Card className="lg:col-span-1 w-full p-4 shadow-none border-none bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col text-left gap-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-5 w-48" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </>
        )}

        {!isLoading && users.length === 0 && (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No users found.
          </div>
        )}

        {!isLoading &&
          users.length > 0 &&
          users.map((u, index) => {
            const inviteStatus =
              u.invitation_status?.toLowerCase?.() || "unknown";
            const fullName =
              u.full_name ||
              `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() ||
              u.email;

            return (
              <div
                key={u.user_id || index}
                className="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0"
              >
                <Card className="lg:col-span-1 w-full p-3 shadow-none border-none bg-white hover:bg-gray-50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col text-left">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fullName}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {u.email}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        <span className="text-gray-400">Status:</span>{" "}
                        {u.user_status}
                      </p>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant="secondary"
                        className={getBadgeStyle(inviteStatus)}
                      >
                        {labelMap[inviteStatus] || "-"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
      </CardContent>
    </div>
  );
}

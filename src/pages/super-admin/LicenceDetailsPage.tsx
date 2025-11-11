"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Calendar, Building2 } from "lucide-react";
import { useLicence } from "@/hooks/super-admin/dashboard/useLicence";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import Pagination from "@/components/shared/Pagination";

export default function LicenceDetailsPage() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isPending } = useLicence({ page, limit });

  const licenses = data?.data?.licenses ?? [];
  const pagination = {
    page: data?.data?.page ?? 1,
    page_size: data?.data?.limit ?? limit,
    total: data?.data?.total ?? 0,
  };

  const getStatusColor = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === "active") return "bg-green-100 text-green-700 border-transparent";
    if (lower === "expired") return "bg-red-100 text-red-700 border-transparent";
    return "bg-gray-100 text-gray-700 border-transparent";
  };

  const getTierColor = (tier: string) => {
    const lower = tier.toLowerCase();
    if (lower === "enterprise") return "bg-purple-100 text-purple-700 border-transparent";
    if (lower === "premium") return "bg-blue-100 text-blue-700 border-transparent";
    return "bg-gray-100 text-gray-700 border-transparent";
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
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
                License Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                View and manage all organization licenses
              </p>
            </div>
          </div>
        </div>

        {/* 🧾 License List */}
        <Card className="bg-white shadow-sm">
          <CardContent>
            {isPending ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="p-4 border">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </Card>
                ))}
              </div>
            ) : licenses.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                No licenses found
              </div>
            ) : (
              <div className="space-y-3">
                {licenses.map((license) => (
                  <Card
                    key={license.id}
                    className="p-4 border hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-5 w-5 text-gray-600" />
                          <h3 className="font-semibold text-lg text-gray-900">
                            {license.organization_name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(license.start_date)} -{" "}
                            {formatDate(license.end_date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className={getTierColor(license.subscription_tier)}
                          >
                            {license.subscription_tier}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`ml-2 ${getStatusColor(
                              license.status
                            )}`}
                          >
                            {license.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {!isPending && licenses.length > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground mt-6 pt-4 border-t">
                <div>
                  Show{" "}
                  {licenses.length > 0
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

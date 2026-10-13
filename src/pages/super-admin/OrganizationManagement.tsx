"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import {
  DataTable,
  type Column,
} from "@/components/super-admin/organization/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// NOTE: Removed unused duplicate import; restore via git history if needed.
import ActionMenu from "@/components/shared/ActionMenu";
import Pagination from "@/components/shared/Pagination";
import ConfirmActionModal from "@/components/shared/forms/ConfirmActionModal";
import CreateOrganizationDialog from "@/components/super-admin/organization/CreateOrganizationDialog";
import ManagementHeader from "@/components/super-admin/ManagementHeader";
import {
  useOrganizationManagement,
  useDeactivateOrganization,
} from "@/hooks/super-admin/organization-management/useOrganizationManagement";
import type { OrganizationRow } from "@/types/super-admin/organization/form-types";
import { toast } from "sonner";

export default function SuperAdminOrganizations() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OrganizationRow[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, error, refetch } = useOrganizationManagement({
    page,
    limit: pageSize,
  });

  useEffect(() => {
    const orgs = data?.data?.organizations ?? [];
    const mapped: OrganizationRow[] = orgs.map((o) => ({
      id: o.id,
      name: o.name ?? "",
      type: o.type ?? "",
      status: o.status ? "Active" : "Deactivated",
      admin_is_active: o.admin_is_active ?? false,
    }));
    setRows(mapped);
  }, [data]);

  const total = data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [selected, setSelected] = useState<OrganizationRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState(false);

  const { mutate: deactivateOrg, isPending } = useDeactivateOrganization({
    onSuccess: (res) => {
      toast.success(res.message || "Organization deactivated successfully");
      refetch();
      setConfirmMode(false);
      setSelected(null);
    },
    onError: (err) => {
      const detail = (err.response?.data as { detail?: string } | undefined)?.detail;
      toast.error(detail || err.message || "Failed to deactivate organization");
    },
  });

  // Handle Deactivate
  const handleDeactivate = () => {
    if (!selected) return;
    deactivateOrg(selected.id);
  };

  const handleView = (row: OrganizationRow) => {
    navigate(`/super-admin/organizations/${row.id}/view`, {
      state: { org: row },
    });
  };

  const columns: Column<OrganizationRow>[] = [
    { key: "name", header: "Name" },
    { key: "type", header: "Type" },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge
          variant="secondary"
          className={
            row.status === "Active"
              ? "bg-green-100 text-green-700 border-transparent"
              : "bg-gray-200 text-gray-700 border-transparent"
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Action",
      render: (row) => (
        <ActionMenu
          row={row}
          align="end"
          showView
          showEdit={false}
          showDeactivate={row.status === "Active"}
          showResend={false}
          onView={() => handleView(row)}
          onDeactivate={() => {
            setSelected(row);
            setConfirmMode(true);
          }}
        />
      ),
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <ManagementHeader
          title="Organization Management"
          addLabel="Add Organization"
          onAdd={() => setCreateOpen(true)}
        />

        <div className="h-[calc(100vh-13.5rem)] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-muted-foreground">
                Loading organizations...
              </div>
            </div>
          )}
          {/* A failed read is never shown as an empty list: until 2026-10-13
              this page said "No organizations found" over every 401/404. */}
          {!isLoading && isError && (
            <div
              role="alert"
              className="flex flex-col items-center justify-center h-full gap-3"
            >
              <div className="text-sm text-red-600">
                Couldn&apos;t load organizations
                {error?.response?.status ? ` (HTTP ${error.response.status})` : ""}.
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-muted-foreground">
                There are no organizations yet.
              </div>
            </div>
          )}
          {!isLoading && !isError && rows.length > 0 && (
            <DataTable columns={columns} data={rows} />
          )}
        </div>

        {!isLoading && !isError && rows.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing {Math.min(pageSize, total - (page - 1) * pageSize)} of{" "}
              {total} results
            </div>
            <Pagination
              pageCount={totalPages}
              page={page}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <CreateOrganizationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => refetch()}
      />

      {/* Confirm Deactivate Modal */}
      <ConfirmActionModal
        open={confirmMode}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmMode(false);
            setSelected(null);
          }
        }}
        title="Deactivate Organization?"
        description="The organization is hidden from every list. Its members keep their accounts and stay linked to it."
        fields={[{ label: "Organization Name", value: selected?.name ?? "" }]}
        confirmLabel={isPending ? "Deactivating..." : "Deactivate"}
        confirmVariant="destructive"
        onConfirm={handleDeactivate}
      />
    </SuperAdminLayout>
  );
}

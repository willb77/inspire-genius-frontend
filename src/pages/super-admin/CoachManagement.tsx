"use client";

import { useMemo, useState } from "react";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { DataTable, type Column } from "@/components/super-admin/organization/DataTable";
import { Badge } from "@/components/ui/badge";
import ActionMenu from "@/components/shared/ActionMenu";
import Pagination from "@/components/shared/Pagination";
import CoachFormModal from "@/components/shared/forms/CoachFormModal";
import type { CoachFormValues } from "@/components/shared/forms/coachForm.constants";
import ConfirmActionModal from "@/components/shared/forms/ConfirmActionModal";
import ManagementHeader from "@/components/super-admin/ManagementHeader";
import { useCoachesList, useCreateCoach, useUpdateCoach, useDeactivateCoach } from "@/hooks/super-admin/coach-management/useCoaches";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { getTones } from "@/services/coaches/settings.service";
import type { MultiSelectOption } from "@/components/ui/multi-select";

type CoachRow = {
  id: string;
  name: string;
  category: string;
  voice_style: string;
  voice_description: string;
  total_sessions: number;
  status: "Active" | "Deactivated";
  type?: string;
};

export default function CoachManagement() {
  const pageSize = 8;
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof CoachRow | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | undefined>(undefined);

  const { data, isLoading, isRefetching } = useCoachesList({ page, limit: pageSize });
  const agents = useMemo(() => {
    const d = data?.data;
    if (Array.isArray(d)) return d;
    return d?.agents ?? [];
  }, [data]);
  const pagination = (Array.isArray(data?.data) ? undefined : data?.data?.pagination) ?? { total: 0, page, page_size: pageSize };

  type ToneItem = { id: string; name: string; display_name: string };
  const { data: tonesResp } = useQuery({
    queryKey: ["agents-settings", "tone"],
    queryFn: () => getTones<{ Tones: ToneItem[] }>(),
    staleTime: 5 * 60 * 1000,
  });
  const toneOptions: MultiSelectOption[] = useMemo(() => {
    const list = ((tonesResp?.data as { Tones?: ToneItem[] } | undefined)?.Tones ?? []);
    return list.map((t) => ({ label: t.display_name || t.name, value: t.display_name || t.name }));
  }, [tonesResp]);

  const rows: CoachRow[] = useMemo(() => {
    return agents.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category_name ?? "",
      voice_style: "",
      voice_description: a.prompts?.[0]?.text ?? "",
      total_sessions: 0,
      status: (a.status?.toLowerCase() === "deactivated" ? "Deactivated" : "Active") as "Active" | "Deactivated",
      type: a.type,
    }));
  }, [agents]);

  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDirection) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return sortDirection === "asc" ? av - bv : bv - av;
      const cmp = String(av).localeCompare(String(bv));
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDirection]);

  const getNextSortDirection = (prev: "asc" | "desc" | undefined) => {
    if (prev === "asc") return "desc" as const;
    if (prev === "desc") return undefined;
    return "asc" as const;
  };

  const onSortChange = (key: string) => {
    const k = key as keyof CoachRow;
    if (sortKey === k) {
      setSortDirection((prev) => getNextSortDirection(prev));
    } else {
      setSortKey(k);
      setSortDirection("asc");
    }
    setPage(1);
  };

  // Action handlers and dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [selected, setSelected] = useState<CoachRow | null>(null);

  const createMutation = useCreateCoach();
  const updateMutation = useUpdateCoach();
  const deactivateMutation = useDeactivateCoach();

  const openAdd = () => setAddOpen(true);
  const openEdit = (row: CoachRow) => {
    setSelected(row);
    setEditOpen(true);
  };
  const openDeactivate = (row: CoachRow) => {
    setSelected(row);
    setDeactivateOpen(true);
  };


  const handleAdd = async (values: CoachFormValues) => {
    const body = {
      name: values.name,
      category_name: values.category,
      prompt: values.voice_description,
    };
    try {
      const resp = await createMutation.mutateAsync(body);
      if (resp?.status) toast.success("Coach created successfully");
      else toast.error(resp?.message || "Failed to create coach");
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      const msg = ax?.response?.data?.message || (e as Error).message || "Failed to create coach";
      toast.error(msg);
      throw e;
    }
  };
  const handleEdit = async (values: CoachFormValues) => {
    if (!selected) return;
    const body = {
      agent_id: selected.id,
      prompt: values.voice_description,
      status: values.status,
    };
    try {
      const resp = await updateMutation.mutateAsync(body);
      if (resp?.status) toast.success("Coach updated successfully");
      else toast.error(resp?.message || "Failed to update coach");
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      const msg = ax?.response?.data?.message || (e as Error).message || "Failed to update coach";
      toast.error(msg);
      throw e;
    }
  };
  const handleDeactivate = async () => {
    if (!selected) return;
    try {
      const resp = await deactivateMutation.mutateAsync(selected.id);
      if (resp?.status) toast.success("Coach deactivated successfully");
      else toast.error(resp?.message || "Failed to deactivate coach");
      setDeactivateOpen(false);
    } catch (e: unknown) {
      const ax = (e as AxiosError<{ message?: string }>);
      const msg = ax?.response?.data?.message || (e as Error).message || "Failed to deactivate coach";
      toast.error(msg);
    }
  };


  const columns: Column<CoachRow>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "category", header: "Category", sortable: true },
    // { key: "voice_style", header: "Voice Style", sortable: true },
    {
      key: "voice_description",
      header: "Voice Description",
      render: (row) => <div className="line-clamp-1">{row.voice_description.length>20 ?`${row.voice_description.slice(0, 20)}...` : row.voice_description}</div>,
    },
    // { key: "total_sessions", header: "Total Sessions", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge
          variant="secondary"
          className={row.status === "Active" ? "bg-green-100 text-green-700 border-transparent" : "bg-gray-200 text-gray-700 border-transparent"}
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
          showView={false}
          showResend={false}
          showEdit={row.type !== "predefined"}
          showDeactivate={row.status === "Active"}
          onEdit={() => openEdit(row)}
          onDeactivate={() => openDeactivate(row)}
        />
      ),
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <ManagementHeader title="Coach Management" addLabel="Add Coach" onAdd={openAdd} />

        <div className="h-[calc(100vh-13.5rem)] overflow-y-auto">
          {isLoading || isRefetching ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: pageSize }).map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-4 items-center">
                  <Skeleton className="h-5" />
                  <Skeleton className="h-5" />
                  <Skeleton className="h-5" />
                  <Skeleton className="h-5" />
                  <Skeleton className="h-5" />
                  <Skeleton className="h-5" />
                </div>
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={sortedRows}
              sortKey={sortKey as string}
              sortDirection={sortDirection}
              onSortChange={onSortChange}
            />
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Show {agents.length > 0 ? (pagination.page - 1) * pagination.page_size + 1 : 0} to {Math.min(pagination.page * pagination.page_size, pagination.total)} of {pagination.total} results
          </div>
          <Pagination pageCount={Math.max(1, Math.ceil(pagination.total / pagination.page_size))} page={page} onPageChange={setPage} />
        </div>
      </div>

      {/* Add Coach */}
      <CoachFormModal
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        onSubmit={handleAdd}
        submitLabel={createMutation.isPending ? "Adding Coach..." : "Add Coach"}
        toneOptions={toneOptions}
      />

      {/* Edit Coach */}
      <CoachFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={selected ? { ...selected, status: selected.status?.toLowerCase() } : undefined}
        onSubmit={handleEdit}
        title="Edit Coach"
        submitLabel={updateMutation.isPending ? "Updating Coach..." : "Save Changes"}
        toneOptions={toneOptions}
      />

      {/* Deactivate Coach */}
      <ConfirmActionModal
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate Coach"
        description="Are you sure you want to deactivate the coach? This also implies for all assigned Organizations."
        fields={[
          { label: "Coach Name", value: selected?.name ?? "" },
          { label: "Category", value: selected?.category ?? "" },
        ]}
        confirmLabel="Deactivate"
        confirmVariant="destructive"
        onConfirm={handleDeactivate}
        confirmLoading={deactivateMutation.isPending}
      />

 
    </SuperAdminLayout>
  );
}

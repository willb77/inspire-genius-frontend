"use client";

import { useMemo, useState } from "react";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { DataTable, type Column } from "@/components/super-admin/organization/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import ActionMenu from "@/components/shared/ActionMenu";
import Pagination from "@/components/shared/Pagination";
import CoachFormModal from "@/components/shared/forms/CoachFormModal";
import type { CoachFormValues } from "@/components/shared/forms/coachForm.constants";
import ConfirmActionModal from "@/components/shared/forms/ConfirmActionModal";
import ManagementHeader from "@/components/super-admin/ManagementHeader";
import {
  useCoachesList,
  useCreateCoach,
  useUpdateCoach,
  useDeactivateCoach,
  useDeleteCoach,
} from "@/hooks/super-admin/coach-management/useCoaches";
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
  persona: string;
  total_sessions: number;
  status: "Active" | "Deactivated";
  type?: string;
};

export default function CoachManagement() {
  const pageSize = 8;
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof CoachRow | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | undefined>(undefined);

  /* ---------- Selection state ---------- */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (rows: CoachRow[]) => {
    const allIds = rows.map((r) => r.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  /* ---------- Data fetching ---------- */
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

  /* ---------- Build rows ---------- */
  const rows: CoachRow[] = useMemo(() => {
    return agents.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category_name ?? "",
      voice_style: a.voice_style ?? "",
      voice_description: a.prompts?.[0]?.text ?? "",
      persona: a.persona ?? "",
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

  /* ---------- Modal state ---------- */
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bulkActivateOpen, setBulkActivateOpen] = useState(false);
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CoachRow | null>(null);

  /* ---------- Mutations ---------- */
  const createMutation = useCreateCoach();
  const updateMutation = useUpdateCoach();
  const deactivateMutation = useDeactivateCoach();
  const deleteMutation = useDeleteCoach();

  /* ---------- Single-row openers ---------- */
  const openAdd = () => setAddOpen(true);
  const openEdit = (row: CoachRow) => { setSelected(row); setEditOpen(true); };
  const openActivate = (row: CoachRow) => { setSelected(row); setActivateOpen(true); };
  const openDeactivate = (row: CoachRow) => { setSelected(row); setDeactivateOpen(true); };
  const openDelete = (row: CoachRow) => { setSelected(row); setDeleteOpen(true); };

  /* ---------- Single-row handlers ---------- */
  const handleAdd = async (values: CoachFormValues) => {
    const body = {
      name: values.name,
      category_name: values.category,
      prompt: values.voice_description,
    };
    try {
      const resp = await createMutation.mutateAsync(body);
      if (resp?.status) toast.success("Mentor created successfully");
      else toast.error(resp?.message || "Failed to create mentor");
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      const msg = ax?.response?.data?.message || (e as Error).message || "Failed to create mentor";
      toast.error(msg);
      throw e;
    }
  };

  const handleEdit = async (values: CoachFormValues) => {
    if (!selected) return;
    const body = {
      agent_id: selected.id,
      prompt: values.voice_description,
      persona: values.persona,
      voice_style: values.voice_style,
      status: values.status,
    };
    try {
      const resp = await updateMutation.mutateAsync(body);
      if (resp?.status) toast.success("Mentor updated successfully");
      else toast.error(resp?.message || "Failed to update mentor");
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      const msg = ax?.response?.data?.message || (e as Error).message || "Failed to update mentor";
      toast.error(msg);
      throw e;
    }
  };

  const handleActivate = async () => {
    if (!selected) return;
    try {
      const resp = await updateMutation.mutateAsync({ agent_id: selected.id, prompt: "", status: "active" });
      if (resp?.status) toast.success("Mentor activated successfully");
      else toast.error(resp?.message || "Failed to activate mentor");
      setActivateOpen(false);
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      const msg = ax?.response?.data?.message || (e as Error).message || "Failed to activate mentor";
      toast.error(msg);
    }
  };

  const handleDeactivate = async () => {
    if (!selected) return;
    try {
      const resp = await deactivateMutation.mutateAsync(selected.id);
      if (resp?.status) toast.success("Mentor deactivated successfully");
      else toast.error(resp?.message || "Failed to deactivate mentor");
      setDeactivateOpen(false);
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      const msg = ax?.response?.data?.message || (e as Error).message || "Failed to deactivate mentor";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      const resp = await deleteMutation.mutateAsync(selected.id);
      if (resp?.status) toast.success("Mentor deleted permanently");
      else toast.error(resp?.message || "Failed to delete mentor");
      setDeleteOpen(false);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(selected.id); return next; });
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      const msg = ax?.response?.data?.message || (e as Error).message || "Failed to delete mentor";
      toast.error(msg);
    }
  };

  /* ---------- Bulk handlers ---------- */
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkActivate = async () => {
    setBulkLoading(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      try {
        await updateMutation.mutateAsync({ agent_id: id, prompt: "", status: "active" });
        successCount++;
      } catch {
        failCount++;
      }
    }
    setBulkLoading(false);
    setBulkActivateOpen(false);
    if (successCount > 0) toast.success(`${successCount} mentor(s) activated`);
    if (failCount > 0) toast.error(`${failCount} mentor(s) failed to activate`);
    setSelectedIds(new Set());
  };

  const handleBulkDeactivate = async () => {
    setBulkLoading(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      try {
        await deactivateMutation.mutateAsync(id);
        successCount++;
      } catch {
        failCount++;
      }
    }
    setBulkLoading(false);
    setBulkDeactivateOpen(false);
    if (successCount > 0) toast.success(`${successCount} mentor(s) deactivated`);
    if (failCount > 0) toast.error(`${failCount} mentor(s) failed to deactivate`);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      try {
        await deleteMutation.mutateAsync(id);
        successCount++;
      } catch {
        failCount++;
      }
    }
    setBulkLoading(false);
    setBulkDeleteOpen(false);
    if (successCount > 0) toast.success(`${successCount} mentor(s) permanently deleted`);
    if (failCount > 0) toast.error(`${failCount} mentor(s) failed to delete`);
    setSelectedIds(new Set());
  };

  /* ---------- Columns ---------- */
  const allOnPageSelected = sortedRows.length > 0 && sortedRows.every((r) => selectedIds.has(r.id));
  const someOnPageSelected = sortedRows.some((r) => selectedIds.has(r.id)) && !allOnPageSelected;

  const columns: Column<CoachRow>[] = [
    {
      key: "select",
      header: (
        <Checkbox
          checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
          onCheckedChange={() => toggleSelectAll(sortedRows)}
          aria-label="Select all"
        />
      ) as unknown as string,
      render: (row) => (
        <Checkbox
          checked={selectedIds.has(row.id)}
          onCheckedChange={() => toggleSelect(row.id)}
          aria-label={`Select ${row.name}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    { key: "name", header: "Name", sortable: true },
    { key: "category", header: "Category", sortable: true },
    {
      key: "voice_description",
      header: "Voice Description",
      render: (row) => <div className="line-clamp-1">{row.voice_description.length > 20 ? `${row.voice_description.slice(0, 20)}...` : row.voice_description}</div>,
    },
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
          showEdit={true}
          showActivate={row.status === "Deactivated"}
          showDeactivate={row.status === "Active"}
          showDelete={true}
          onEdit={() => openEdit(row)}
          onActivate={() => openActivate(row)}
          onDeactivate={() => openDeactivate(row)}
          onDelete={() => openDelete(row)}
        />
      ),
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <ManagementHeader title="Mentor Management" addLabel="Add Mentor" onAdd={openAdd} />

        {/* Bulk action buttons */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-1">{selectedIds.size} selected</span>
            <Button
              variant="outline"
              size="sm"
              className="border-green-500 text-green-600 hover:bg-green-50"
              onClick={() => setBulkActivateOpen(true)}
            >
              Activate Selected ({selectedIds.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-500 text-amber-600 hover:bg-amber-50"
              onClick={() => setBulkDeactivateOpen(true)}
            >
              Deactivate Selected ({selectedIds.size})
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              Delete Selected ({selectedIds.size})
            </Button>
          </div>
        )}

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
        submitLabel={createMutation.isPending ? "Adding Mentor..." : "Add Mentor"}
        toneOptions={toneOptions}
      />

      {/* Edit Coach */}
      <CoachFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={selected ? { ...selected, status: selected.status?.toLowerCase() } : undefined}
        onSubmit={handleEdit}
        title="Edit Mentor"
        submitLabel={updateMutation.isPending ? "Updating Mentor..." : "Save Changes"}
        toneOptions={toneOptions}
      />

      {/* Activate Coach */}
      <ConfirmActionModal
        open={activateOpen}
        onOpenChange={setActivateOpen}
        title="Activate Mentor"
        description="Are you sure you want to activate this mentor? They will become available for all assigned organizations."
        fields={[
          { label: "Mentor Name", value: selected?.name ?? "" },
          { label: "Category", value: selected?.category ?? "" },
        ]}
        confirmLabel="Activate"
        onConfirm={handleActivate}
        confirmLoading={updateMutation.isPending}
      />

      {/* Deactivate Coach */}
      <ConfirmActionModal
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate Mentor"
        description="Are you sure you want to deactivate the mentor? This also implies for all assigned Organizations."
        fields={[
          { label: "Mentor Name", value: selected?.name ?? "" },
          { label: "Category", value: selected?.category ?? "" },
        ]}
        confirmLabel="Deactivate"
        confirmVariant="destructive"
        onConfirm={handleDeactivate}
        confirmLoading={deactivateMutation.isPending}
      />

      {/* Delete Mentor (hard delete) */}
      <ConfirmActionModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Mentor"
        description="Are you sure you want to permanently delete this mentor? This action cannot be undone and will remove the mentor from all assigned organizations."
        fields={[
          { label: "Mentor Name", value: selected?.name ?? "" },
          { label: "Category", value: selected?.category ?? "" },
        ]}
        confirmLabel="Delete Permanently"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        confirmLoading={deleteMutation.isPending}
      />

      {/* Bulk Activate */}
      <ConfirmActionModal
        open={bulkActivateOpen}
        onOpenChange={setBulkActivateOpen}
        title="Activate Selected Mentors"
        description={`Are you sure you want to activate ${selectedIds.size} selected mentor(s)? They will become available for all assigned organizations.`}
        fields={[]}
        confirmLabel={`Activate ${selectedIds.size} Mentor(s)`}
        onConfirm={handleBulkActivate}
        confirmLoading={bulkLoading}
      />

      {/* Bulk Deactivate */}
      <ConfirmActionModal
        open={bulkDeactivateOpen}
        onOpenChange={setBulkDeactivateOpen}
        title="Deactivate Selected Mentors"
        description={`Are you sure you want to deactivate ${selectedIds.size} selected mentor(s)? This will affect all their assigned organizations.`}
        fields={[]}
        confirmLabel={`Deactivate ${selectedIds.size} Mentor(s)`}
        confirmVariant="destructive"
        onConfirm={handleBulkDeactivate}
        confirmLoading={bulkLoading}
      />

      {/* Bulk Delete */}
      <ConfirmActionModal
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete Selected Mentors"
        description={`Are you sure you want to permanently delete ${selectedIds.size} selected mentor(s)? This action cannot be undone.`}
        fields={[]}
        confirmLabel={`Delete ${selectedIds.size} Mentor(s) Permanently`}
        confirmVariant="destructive"
        onConfirm={handleBulkDelete}
        confirmLoading={bulkLoading}
      />

    </SuperAdminLayout>
  );
}

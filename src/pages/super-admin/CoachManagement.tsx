"use client";

import { useState } from "react";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { DataTable, type Column } from "@/components/super-admin/organization/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDownAZ, Plus, SlidersVertical } from "lucide-react";
import ActionMenu from "@/components/shared/ActionMenu";
import Pagination from "@/components/shared/Pagination";
import CoachFormModal from "@/components/shared/forms/CoachFormModal";
import type { CoachFormValues } from "@/components/shared/forms/coachForm.constants";
import ConfirmActionModal from "@/components/shared/forms/ConfirmActionModal";
import { useSortingPagination } from "@/hooks/useSortingPagination";

type CoachRow = {
  id: string;
  name: string;
  category: string;
  voice_style: string;
  voice_description: string;
  total_sessions: number;
  status: "Active" | "Deactivated";
};

export default function CoachManagement() {
  const [rows, setRows] = useState<CoachRow[]>([
    { id: "1", name: "Coach Name", category: "Job Seeker", voice_style: "Calm, Motivation", voice_description: "Velit laborum ad pariatur", total_sessions: 56, status: "Active" },
    { id: "2", name: "Coach Name", category: "Education", voice_style: "Calm", voice_description: "Officia commodo ad es", total_sessions: 15, status: "Active" },
    { id: "3", name: "Coach Name", category: "Career", voice_style: "Motivation", voice_description: "Est tempor fugiat cupid", total_sessions: 15, status: "Deactivated" },
    { id: "4", name: "Coach Name", category: "Business", voice_style: "Encouraging, Motivation", voice_description: "Nulla ex labore velit inur", total_sessions: 86, status: "Active" },
    { id: "5", name: "Coach Name", category: "Healthcare", voice_style: "Warm, Straightforward", voice_description: "Ad duis sit cillum fugiat", total_sessions: 83, status: "Active" },
    { id: "6", name: "Coach Name", category: "Personal", voice_style: "Encouraging", voice_description: "Voluptate culpa dolor c", total_sessions: 41, status: "Active" },
    { id: "7", name: "Coach Name", category: "Wellness", voice_style: "Warm, Calm", voice_description: "Amet culpa magna veni", total_sessions: 58, status: "Active" },
    { id: "8", name: "Coach Name", category: "Human Resource", voice_style: "Straightforward", voice_description: "Labore in laboris elit co", total_sessions: 29, status: "Active" },
  ]);

  const pageSize = 8;
  const { sortKey, sortDirection, page, setPage, onSortChange, paginated, total, totalPages, start } =
    useSortingPagination<CoachRow>(rows, pageSize);

  // Action handlers and dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CoachRow | null>(null);

  const openAdd = () => setAddOpen(true);
  const openEdit = (row: CoachRow) => {
    setSelected(row);
    setEditOpen(true);
  };
  const openDeactivate = (row: CoachRow) => {
    setSelected(row);
    setDeactivateOpen(true);
  };
  const openDelete = (row: CoachRow) => {
    setSelected(row);
    setDeleteOpen(true);
  };

  const handleAdd = (values: CoachFormValues) => {
    const newRow: CoachRow = {
      id: Date.now().toString(),
      name: values.name,
      category: values.category,
      voice_style: values.voice_style,
      voice_description: values.voice_description,
      total_sessions: 0,
      status: "Active",
    };
    setRows((r) => [newRow, ...r]);
  };
  const handleEdit = (values: CoachFormValues) => {
    if (!selected) return;
    setRows((r) =>
      r.map((row) =>
        row.id === selected.id
          ? { ...row, name: values.name, category: values.category, voice_style: values.voice_style, voice_description: values.voice_description }
          : row
      )
    );
  };
  const handleDeactivate = () => {
    if (!selected) return;
    setRows((r) => r.map((row) => (row.id === selected.id ? { ...row, status: "Deactivated" } : row)));
    setDeactivateOpen(false);
  };
  const handleDelete = () => {
    if (!selected) return;
    setRows((r) => r.filter((row) => row.id !== selected.id));
    setDeleteOpen(false);
  };

  const columns: Column<CoachRow>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "category", header: "Category", sortable: true },
    { key: "voice_style", header: "Voice Style", sortable: true },
    { key: "voice_description", header: "Voice Description" },
    { key: "total_sessions", header: "Total Sessions", sortable: true },
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
          showEdit
          showDeactivate
          showDelete
          onEdit={() => openEdit(row)}
          onDeactivate={() => openDeactivate(row)}
          onDelete={() => openDelete(row)}
        />
      ),
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-left">Coach Management</h1>
          <div className="flex flex-wrap gap-6">
            <Button variant="outline" className="bg-gray-20">
              Sort By
              <ArrowDownAZ className="size-4" />
            </Button>
            <Button variant="outline" className="bg-gray-20">
              Filter
              <SlidersVertical className="size-4" />
            </Button>
            <Button onClick={openAdd}>
              <Plus className="size-4" />
              Add Coach
            </Button>
          </div>
        </div>

        <div className="h-[calc(100vh-13.5rem)] overflow-y-auto">
          <DataTable
            columns={columns}
            data={paginated}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>Show {Math.min(pageSize, total - start)} of {total} results</div>
          <Pagination pageCount={totalPages} page={page} onPageChange={setPage} />
        </div>
      </div>

      {/* Add Coach */}
      <CoachFormModal
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        onSubmit={handleAdd}
      />

      {/* Edit Coach */}
      <CoachFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={selected ?? undefined}
        onSubmit={handleEdit}
        title="Edit Coach"
        submitLabel="Save Changes"
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
      />

      {/* Delete Coach */}
      <ConfirmActionModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Coach"
        description="Are you sure you want to permanently delete this coach? This action cannot be undone."
        fields={[
          { label: "Coach Name", value: selected?.name ?? "" },
          { label: "Category", value: selected?.category ?? "" },
        ]}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </SuperAdminLayout>
  );
}

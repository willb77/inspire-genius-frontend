"use client";

import { useMemo, useState } from "react";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { DataTable, type Column } from "@/components/super-admin/organization/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDownAZ, Plus, SlidersVertical } from "lucide-react";
import ActionMenu from "@/components/shared/ActionMenu";
import Pagination from "@/components/shared/Pagination";
import TeamFormModal from "@/components/shared/forms/TeamFormModal";
import type { TeamFormValues } from "@/components/shared/forms/teamForm.constants";
import ConfirmActionModal from "@/components/shared/forms/ConfirmActionModal";

type TeamRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Deactivated";
};

export default function TeamManagement() {
  const [rows, setRows] = useState<TeamRow[]>([
    { id: "1", name: "Zoya Sheikh", email: "zoya@devron.com", role: "Admin", status: "Active" },
    { id: "2", name: "Arjun Menon", email: "arjun@greenwood.edu", role: "Admin", status: "Active" },
    { id: "3", name: "Divya Sinha", email: "divya@prism.ai", role: "Admin", status: "Deactivated" },
    { id: "4", name: "Vikas Rao", email: "vikas@consultant.io", role: "Manager", status: "Active" },
    { id: "5", name: "Reena Nair", email: "reena@cambridge.edu", role: "Employee", status: "Active" },
    { id: "6", name: "Faizan Khan", email: "faizan@zencorp.com", role: "Human Resource", status: "Active" },
    { id: "7", name: "Aditya Sharma", email: "aditya@prism.ai", role: "Manager", status: "Active" },
    { id: "8", name: "Lakshmi Iyer", email: "lakshmi@newwave.org", role: "Lead", status: "Active" },
  ]);

  const [sortKey, setSortKey] = useState<keyof TeamRow | undefined>();
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | undefined>();
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const onSortChange = (key: string) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : prev === "desc" ? undefined : "asc"));
    } else {
      setSortKey(key as keyof TeamRow);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDirection) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDirection]);

  const total = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paginated = sortedRows.slice(start, start + pageSize);

  // dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<TeamRow | null>(null);

  const openAdd = () => setAddOpen(true);
  const openEdit = (row: TeamRow) => {
    setSelected(row);
    setEditOpen(true);
  };
  const openDeactivate = (row: TeamRow) => {
    setSelected(row);
    setDeactivateOpen(true);
  };
  const openDelete = (row: TeamRow) => {
    setSelected(row);
    setDeleteOpen(true);
  };

  const handleAdd = (values: TeamFormValues) => {
    const newRow: TeamRow = {
      id: Date.now().toString(),
      name: values.name,
      email: values.email,
      role: values.role,
      status: values.status ?? "Active",
    };
    setRows((r) => [newRow, ...r]);
  };
  const handleEdit = (values: TeamFormValues) => {
    if (!selected) return;
    setRows((r) =>
      r.map((row) =>
        row.id === selected.id
          ? { ...row, name: values.name, email: values.email, role: values.role, status: values.status }
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

  const columns: Column<TeamRow>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "email", header: "Email", sortable: true },
    { key: "role", header: "Role", sortable: true },
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
          <h1 className="text-2xl font-semibold tracking-tight text-left">Team Management</h1>
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
              Add User
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

      {/* Add User */}
      <TeamFormModal
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        onSubmit={handleAdd}
      />

      {/* Edit User */}
      <TeamFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={selected ?? undefined}
        onSubmit={handleEdit}
        title="Edit User"
        submitLabel="Save Changes"
      />

      {/* Deactivate User */}
      <ConfirmActionModal
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate User?"
        description="Are you sure you want to deactivate the Organization?"
        fields={[
          { label: "User Name", value: selected?.name ?? "" },
          { label: "Role", value: selected?.role ?? "" },
        ]}
        confirmLabel="Deactivate"
        confirmVariant="destructive"
        onConfirm={handleDeactivate}
      />

      {/* Delete User */}
      <ConfirmActionModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete User"
        description="Are you sure you want to permanently delete this user? This action cannot be undone."
        fields={[
          { label: "User Name", value: selected?.name ?? "" },
          { label: "Role", value: selected?.role ?? "" },
        ]}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </SuperAdminLayout>
  );
}

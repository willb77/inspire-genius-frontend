"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import {
  DataTable,
  type Column,
} from "@/components/super-admin/organization/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconInput } from "@/components/ui/icon-input";
import ActionMenu from "@/components/shared/ActionMenu";
import Pagination from "@/components/shared/Pagination";
import UserFormModal from "@/components/shared/forms/UserFormModal";
import type { UserFormValues } from "@/components/shared/forms/userForm.constants";
import ConfirmActionModal from "@/components/shared/forms/ConfirmActionModal";
import DestructiveConfirmModal from "@/components/shared/forms/DestructiveConfirmModal";
import ManagementHeader from "@/components/super-admin/ManagementHeader";
import {
  useUserManagement,
  useInviteUser,
  useUpdateUser,
  useChangeUserRole,
  useDeleteUser,
  useResendInvitation,
  useInactiveUserCount,
  usePurgeInactiveUsers,
} from "@/hooks/super-admin/user-management/useUserManagement";
import { deleteUserByEmail } from "@/services/super-admin/user-management/user-management.service";
import { useRoles } from "@/hooks/super-admin/useRoles";
import { toast } from "sonner";
import type { UserRow } from "@/types/super-admin/user-management";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import { ROLE_LABELS } from "@/types/roles";
import { Search, Trash2, UserX, UserCheck, X, FileUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PrismIngestDialog, {
  type PrismIngestTarget,
} from "@/components/super-admin/user-management/PrismIngestDialog";

export default function UserManagement() {
  const pageSize = 10;
  const [page, setPage] = useState(1);

  // Bundle 3 (2026-05-28): debounced search. The backend list endpoint
  // already accepts a `search` LIKE filter on email + full_name; the UI
  // just had no input wired to it. 300 ms debounce — short enough to feel
  // live, long enough to coalesce typing into a single request.
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  // Reset to page 1 whenever the search term changes — otherwise the page
  // number can index past the filtered total and produce an empty list.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Super-admin visibility toggle. Default off — matches the historical
  // listing behavior that strips super-admins to keep the table focused on
  // the users an admin manages. When on, the API returns super-admins too,
  // so a super-admin can find themselves and peers in the table.
  const [showSuperAdmins, setShowSuperAdmins] = useState(false);
  useEffect(() => {
    setPage(1);
  }, [showSuperAdmins]);

  const { data, isLoading, isRefetching } = useUserManagement({
    page,
    limit: pageSize,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(showSuperAdmins ? { include_super_admins: true } : {}),
  });
  const { data: rolesData } = useRoles();
  const roles = useMemo(() => rolesData?.data?.roles ?? [], [rolesData]);

  const users = useMemo(() => data?.data?.users ?? [], [data]);
  const pagination = data?.data?.pagination ?? {
    total: 0,
    page,
    limit: pageSize,
  };

  const rows: UserRow[] = useMemo(() => {
    return users.map((u) => {
      let status: "Active" | "Deactivated" | "Awaiting";
      if (u.user_status?.toLowerCase?.() === "active" || u.is_active) {
        status = "Active";
      } else if (u.user_status?.toLowerCase?.() === "awaiting") {
        status = "Awaiting";
      } else {
        status = "Deactivated";
      }

      return {
        id: u.user_id,
        name: u.full_name ?? "",
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        status,
        invitation_id: u.invitation_id,
        invitation_status:
          u.invitation_status?.toLowerCase?.() || "not_applicable",
        created_at: u.created_at,
        is_email_verified: u.is_email_verified,
      };
    });
  }, [users]);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Force-delete (typed-confirmation friction) — used when removing an already
  // soft-deleted user, since the Aurora row + Cognito account go away for good.
  const [forceDeleteOpen, setForceDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);

  // Bulk selection state
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkActivateOpen, setBulkActivateOpen] = useState(false);
  const [bulkActivating, setBulkActivating] = useState(false);

  // PRISM CSV ingest (per-user via Action menu, or bulk via selection)
  const [prismIngestOpen, setPrismIngestOpen] = useState(false);
  const [prismTargets, setPrismTargets] = useState<PrismIngestTarget[]>([]);
  const openPrismIngest = useCallback((targets: PrismIngestTarget[]) => {
    if (targets.length === 0) return;
    setPrismTargets(targets);
    setPrismIngestOpen(true);
  }, []);

  // Purge inactive users state
  const [purgeOpen, setPurgeOpen] = useState(false);
  const { data: inactiveCount, isLoading: isLoadingInactiveCount } =
    useInactiveUserCount(purgeOpen);
  const purgeMutation = usePurgeInactiveUsers();

  const allVisibleSelected =
    rows.length > 0 && rows.every((r) => selectedEmails.has(r.email));

  const toggleSelectAll = useCallback(() => {
    setSelectedEmails((prev) => {
      if (rows.every((r) => prev.has(r.email))) {
        // Deselect all visible
        const next = new Set(prev);
        for (const r of rows) next.delete(r.email);
        return next;
      }
      // Select all visible
      const next = new Set(prev);
      for (const r of rows) next.add(r.email);
      return next;
    });
  }, [rows]);

  const toggleSelectOne = useCallback((email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }, []);

  const queryClient = useQueryClient();
  const inviteMutation = useInviteUser();
  const updateMutation = useUpdateUser();
  const changeRoleMutation = useChangeUserRole();
  const deleteMutation = useDeleteUser();
  const resendMutation = useResendInvitation();

  const openAdd = () => setAddOpen(true);
  const openView = (row: UserRow) => {
    setSelected(row);
    setViewOpen(true);
  };
  const openEdit = (row: UserRow) => {
    setSelected(row);
    setEditOpen(true);
  };
  const openDeactivate = (row: UserRow) => {
    setSelected(row);
    setDeactivateOpen(true);
  };
  const openDelete = (row: UserRow) => {
    setSelected(row);
    // Deactivated users are already soft-deleted; deleting them again is the
    // irreversible hard-delete (Aurora + Cognito). Route those to the
    // typed-confirmation modal. Everything else (Active, Awaiting) is reversible
    // and uses the lighter ConfirmActionModal.
    if (row.status === "Deactivated") {
      setForceDeleteOpen(true);
    } else {
      setDeleteOpen(true);
    }
  };
  const openActivate = (row: UserRow) => {
    setSelected(row);
    setActivateOpen(true);
  };

  const getRoleIdByName = (roleName: string): string | undefined => {
    const role = roles.find((r) => r.name === roleName);
    return role?.id;
  };

  const handleAdd = async (values: UserFormValues) => {
    // Issue #204: auth-service /v1/admin/invite-user takes role NAME
    // (resolved to role_id server-side). getRoleIdByName retained for
    // form-validation parity only — no longer sent on the wire.
    void getRoleIdByName;
    const body = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      role: values.role,
    };

    await inviteMutation.mutateAsync(body);
  };

  const handleEdit = async (values: UserFormValues) => {
    if (!selected) return;

    const body = {
      first_name: values.first_name,
      last_name: values.last_name,
      is_active:
        selected.status === "Awaiting" ? undefined : values.status === "Active",
    };

    const promises: Promise<unknown>[] = [
      updateMutation.mutateAsync({
        email: selected.email,
        payload: body,
      }),
    ];

    // If role changed, send a separate role-change request.
    // PR #291 strangler extraction: path param is user_id UUID (not email);
    // backend returns 400 if an email is passed. Body still uses role NAME.
    if (values.role && values.role !== selected.role) {
      promises.push(
        changeRoleMutation.mutateAsync({
          user_id: selected.id,
          email: selected.email,
          payload: { role: values.role },
        })
      );
    }

    await Promise.all(promises);
  };

  const handleDeactivate = async () => {
    if (!selected) return;

    await updateMutation.mutateAsync({
      email: selected.email,
      payload: {
        ...(selected.first_name ? { first_name: selected.first_name } : {}),
        ...(selected.last_name ? { last_name: selected.last_name } : {}),
        is_active: false,
      },
    });

    setDeactivateOpen(false);
  };

  const handleActivate = async () => {
    if (!selected) return;

    await updateMutation.mutateAsync({
      email: selected.email,
      payload: {
        ...(selected.first_name ? { first_name: selected.first_name } : {}),
        ...(selected.last_name ? { last_name: selected.last_name } : {}),
        is_active: true,
      },
    });

    setActivateOpen(false);
  };

  const handleDelete = async () => {
    if (!selected) return;

    // This modal is now only opened for non-Deactivated rows (Active or
    // Awaiting) — the Deactivated branch routes through handleForceDelete.
    // force=false: backend takes the soft-delete branch for Active users.
    try {
      await deleteMutation.mutateAsync({ email: selected.email, force: false });
      setDeleteOpen(false);
    } catch {
      // Error toast already shown by mutation onError callback
    }
  };

  const handleForceDelete = async () => {
    if (!selected) return;

    // Typed-confirmation modal opens for deactivated rows. force=true tells
    // the backend to hard-delete (Aurora row + Cognito account + cascading
    // related rows). Irreversible.
    try {
      await deleteMutation.mutateAsync({ email: selected.email, force: true });
      setForceDeleteOpen(false);
    } catch {
      // Error toast already shown by mutation onError callback
    }
  };

  const handleResend = async (row: UserRow) => {
    if (!row.invitation_id) {
      toast.error("No invitation found to resend");
      return;
    }

    await resendMutation.mutateAsync(row.invitation_id);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const emails = Array.from(selectedEmails);

    // Force-delete is required per-row when the user is already deactivated;
    // backend refuses a plain DELETE on is_deleted=True rows.
    const results = await Promise.allSettled(
      emails.map((email) => {
        const row = rows.find((r) => r.email === email);
        const force = row?.status === "Deactivated";
        return deleteUserByEmail(email, force);
      })
    );

    const succeeded: string[] = [];
    const failed: string[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.status !== false) {
        succeeded.push(emails[index]);
      } else {
        failed.push(emails[index]);
      }
    });

    // Keep only the failed emails selected
    setSelectedEmails(new Set(failed));

    // Invalidate query cache once after all operations
    queryClient.invalidateQueries({
      queryKey: ["super-admin", "user-management"],
      exact: false,
    });

    if (succeeded.length > 0 && failed.length === 0) {
      toast.success(`Deleted ${succeeded.length} user(s)`);
    } else if (succeeded.length > 0 && failed.length > 0) {
      toast.warning(
        `Deleted ${succeeded.length} user(s), but ${failed.length} could not be deleted`
      );
    } else {
      toast.error("No users could be deleted");
    }

    if (failed.length === 0) {
      setBulkDeleteOpen(false);
    }

    setBulkDeleting(false);
  };

  const handleBulkActivate = async () => {
    setBulkActivating(true);
    const emails = Array.from(selectedEmails);

    const results = await Promise.allSettled(
      emails.map((email) => {
        const user = rows.find((r) => r.email === email);
        return updateMutation.mutateAsync({
          email,
          payload: {
            ...(user?.first_name ? { first_name: user.first_name } : {}),
            ...(user?.last_name ? { last_name: user.last_name } : {}),
            is_active: true,
          },
        });
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (succeeded > 0 && failed === 0) {
      toast.success(`Activated ${succeeded} user(s)`);
      setSelectedEmails(new Set());
    } else if (succeeded > 0) {
      toast.warning(`Activated ${succeeded} user(s), but ${failed} could not be activated`);
    } else {
      toast.error("No users could be activated");
    }

    queryClient.invalidateQueries({
      queryKey: ["super-admin", "user-management"],
      exact: false,
    });

    setBulkActivateOpen(false);
    setBulkActivating(false);
  };

  const handlePurgeInactive = async () => {
    await purgeMutation.mutateAsync();
    setPurgeOpen(false);
  };

  const columns: Column<UserRow>[] = [
    {
      key: "_select",
      header: (
        <Checkbox
          checked={allVisibleSelected}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all"
        />
      ),
      render: (row) => (
        <Checkbox
          checked={selectedEmails.has(row.email)}
          onCheckedChange={() => toggleSelectOne(row.email)}
          aria-label={`Select ${row.email}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <span className="text-sm">
          {ROLE_LABELS[row.role ?? ""] ?? row.role ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const statusStyles: Record<string, string> = {
          Active: "bg-green-100 text-green-700 border-transparent",
          Deactivated: "bg-red-100 text-red-700 border-transparent",
          Awaiting: "bg-yellow-100 text-yellow-700 border-transparent",
        };
        return (
          <Badge
            variant="secondary"
            className={statusStyles[row.status] ?? "bg-gray-200 text-gray-700 border-transparent"}
          >
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: "invitation_status",
      header: "Invitation",
      render: (row) => {
        const badgeConfig: Record<
          string,
          { label: string; className: string }
        > = {
          invitation_sent: {
            label: "Sent",
            className: "bg-yellow-100 text-yellow-700 border-transparent",
          },
          pending: {
            label: "Pending",
            className: "bg-yellow-100 text-yellow-700 border-transparent",
          },
          accepted: {
            label: "Accepted",
            className: "bg-green-100 text-green-700 border-transparent",
          },
          expired: {
            label: "Expired",
            className: "bg-red-100 text-red-700 border-transparent",
          },
        };
        const badge = badgeConfig[row.invitation_status];
        if (!badge) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <Badge variant="secondary" className={badge.className}>
            {badge.label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      render: (row) => (
        <ActionMenu
          row={row}
          align="end"
          showView={true}
          showEdit={row.status !== "Awaiting"}
          showResend={row.status === "Awaiting"}
          showDeactivate={row.status === "Active"}
          showActivate={row.status === "Deactivated"}
          showDelete={true}
          showImportPrism={true}
          onView={() => openView(row)}
          onEdit={() => openEdit(row)}
          onResend={() => handleResend(row)}
          onDeactivate={() => openDeactivate(row)}
          onActivate={() => openActivate(row)}
          onDelete={() => openDelete(row)}
          onImportPrism={() =>
            openPrismIngest([{ id: row.id, email: row.email, name: row.name }])
          }
        />
      ),
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <ManagementHeader
          title="User Management"
          addLabel="Add User"
          onAdd={openAdd}
          extraActions={
            <>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setPurgeOpen(true)}
              >
                <UserX className="size-4" />
                Purge Inactive
              </Button>
              {selectedEmails.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    className="border-indigo-500 text-indigo-700 hover:bg-indigo-50"
                    onClick={() =>
                      openPrismIngest(
                        rows
                          .filter((r) => selectedEmails.has(r.email))
                          .map((r) => ({ id: r.id, email: r.email, name: r.name })),
                      )
                    }
                  >
                    <FileUp className="size-4" />
                    Ingest PRISM CSV ({rows.filter((r) => selectedEmails.has(r.email)).length})
                  </Button>
                  <Button
                    variant="outline"
                    className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setBulkActivateOpen(true)}
                  >
                    <UserCheck className="size-4" />
                    Activate Selected ({selectedEmails.size})
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    Delete Selected ({selectedEmails.size})
                  </Button>
                </>
              )}
            </>
          }
        />
        <div className="flex items-center gap-2">
          <IconInput
            type="search"
            placeholder="Search by name or email…"
            leftIcon={<Search className="size-4" aria-hidden="true" />}
            rightIcon={
              searchInput ? <X className="size-4" aria-hidden="true" /> : undefined
            }
            onRightIconClick={() => setSearchInput("")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-md"
            aria-label="Search users"
          />
          {debouncedSearch && (
            <span className="text-xs text-muted-foreground">
              Filtered by "{debouncedSearch}"
            </span>
          )}
          <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <Checkbox
              checked={showSuperAdmins}
              onCheckedChange={(v) => setShowSuperAdmins(v === true)}
              aria-label="Show super-admins"
            />
            Show super-admins
          </label>
        </div>
        <div className="h-[calc(100vh-16rem)] overflow-y-auto">
          {isLoading || isRefetching ? (
            <LoadingSkeleton columns={6} rows={pageSize} />
          ) : (
            <DataTable columns={columns} data={rows} />
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Show{" "}
            {users.length > 0
              ? (pagination.page - 1) * pagination.limit + 1
              : 0}{" "}
            to {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
            of {pagination.total} results
          </div>
          <Pagination
            pageCount={Math.max(1, Math.ceil(pagination.total / pagination.limit))}
            page={page}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* View User Detail Modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription className="sr-only">View user information</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <DetailRow label="Name" value={selected.name || "—"} />
              <DetailRow label="Email" value={selected.email} />
              <DetailRow label="Role" value={ROLE_LABELS[selected.role ?? ""] ?? selected.role ?? "—"} />
              <DetailRow label="Status">
                <Badge
                  variant="secondary"
                  className={
                    selected.status === "Active"
                      ? "bg-green-100 text-green-700 border-transparent"
                      : selected.status === "Awaiting"
                        ? "bg-yellow-100 text-yellow-700 border-transparent"
                        : "bg-red-100 text-red-700 border-transparent"
                  }
                >
                  {selected.status}
                </Badge>
              </DetailRow>
              <DetailRow
                label="Email Verified"
                value={selected.is_email_verified ? "Yes" : "No"}
              />
              <DetailRow
                label="Created"
                value={
                  selected.created_at
                    ? new Date(selected.created_at).toLocaleDateString()
                    : "—"
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PRISM CSV ingest (per-user or bulk) */}
      <PrismIngestDialog
        open={prismIngestOpen}
        onOpenChange={setPrismIngestOpen}
        targets={prismTargets}
      />

      {/* Add User Modal */}
      <UserFormModal
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        onSubmit={handleAdd}
        submitLabel={inviteMutation.isPending ? "Adding User..." : "Add User"}
        allowStatusEdit={false}
      />

      {/* Edit User Modal */}
      <UserFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={
          selected
            ? {
                first_name: selected.first_name ?? "",
                last_name: selected.last_name ?? "",
                email: selected.email,
                role: selected.role ?? "",
                status:
                  selected.status === "Deactivated" ? "Deactivated" : "Active",
              }
            : undefined
        }
        onSubmit={handleEdit}
        title="Edit User"
        submitLabel={
          updateMutation.isPending || changeRoleMutation.isPending ? "Updating User..." : "Save Changes"
        }
        allowStatusEdit={selected?.status !== "Awaiting"}
        invitationContext={
          selected?.invitation_id
            ? {
                userId: selected.id,
                invitationId: selected.invitation_id,
                invitationStatus: selected.invitation_status,
              }
            : undefined
        }
      />

      {/* Deactivate Confirmation */}
      <ConfirmActionModal
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate User"
        description="Are you sure you want to deactivate this user? They will no longer be able to log in."
        fields={[
          { label: "Name", value: selected?.name ?? "" },
          { label: "Email", value: selected?.email ?? "" },
        ]}
        confirmLabel="Deactivate"
        confirmVariant="destructive"
        onConfirm={handleDeactivate}
        confirmLoading={updateMutation.isPending}
      />

      {/* Activate Confirmation */}
      <ConfirmActionModal
        open={activateOpen}
        onOpenChange={setActivateOpen}
        title="Activate User"
        description="Are you sure you want to reactivate this user? They will be able to log in again."
        fields={[
          { label: "Name", value: selected?.name ?? "" },
          { label: "Email", value: selected?.email ?? "" },
        ]}
        confirmLabel="Activate"
        onConfirm={handleActivate}
        confirmLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation — soft-delete path (Active / Awaiting rows).
          Deactivated rows route to the DestructiveConfirmModal below. */}
      <ConfirmActionModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete User"
        description={
          selected?.status === "Active"
            ? "This will deactivate the user (soft delete). Their record is retained for audit; they will no longer be able to log in. You can purge them later from the Deactivated list."
            : "Are you sure you want to delete this user?"
        }
        fields={[
          { label: "Name", value: selected?.name ?? "" },
          { label: "Email", value: selected?.email ?? "" },
        ]}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        confirmLoading={deleteMutation.isPending}
      />

      {/* Force-Delete Confirmation — hard-delete path for already-deactivated
          rows. Requires the operator to type the user's email verbatim. */}
      <DestructiveConfirmModal
        open={forceDeleteOpen}
        onOpenChange={setForceDeleteOpen}
        title="Permanently delete user"
        description={
          <>
            This will <strong>permanently</strong> delete{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              {selected?.email ?? ""}
            </code>{" "}
            from the database and Cognito, along with all related records
            (conversations, files, feedback) via cascade. This action cannot be undone.
          </>
        }
        confirmPhrase={selected?.email ?? ""}
        confirmHint="user's email"
        confirmLabel="Permanently delete"
        loading={deleteMutation.isPending}
        onConfirm={handleForceDelete}
      />

      {/* Bulk Delete — typed-confirmation friction since multiple users in one click. */}
      <DestructiveConfirmModal
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete selected users"
        description={
          <>
            This will delete <strong>{selectedEmails.size}</strong> selected
            user(s). Active rows are soft-deleted (reversible); already-deactivated
            rows are permanently removed from the database and Cognito with all
            cascading data. Use with care.
          </>
        }
        confirmPhrase={`DELETE ${selectedEmails.size}`}
        confirmHint="phrase"
        confirmLabel={`Delete ${selectedEmails.size} user(s)`}
        loading={bulkDeleting}
        onConfirm={handleBulkDelete}
      />

      {/* Bulk Activate Confirmation */}
      <ConfirmActionModal
        open={bulkActivateOpen}
        onOpenChange={setBulkActivateOpen}
        title="Activate Selected Users"
        description={`Are you sure you want to activate ${selectedEmails.size} user(s)? They will be able to log in.`}
        fields={[
          { label: "Users to activate", value: `${selectedEmails.size}` },
        ]}
        confirmLabel="Activate All"
        onConfirm={handleBulkActivate}
        confirmLoading={bulkActivating}
      />

      {/* Purge Inactive Users — typed-confirmation friction.
          Hits the new server-side POST /v1/user-management/users/purge-inactive. */}
      <DestructiveConfirmModal
        open={purgeOpen}
        onOpenChange={setPurgeOpen}
        title="Purge all deactivated users"
        description={
          <>
            This will <strong>permanently</strong> delete{" "}
            <strong>
              {isLoadingInactiveCount ? "…" : (inactiveCount ?? 0)}
            </strong>{" "}
            deactivated user(s) from the database and Cognito. Their
            conversations, files, and feedback will be deleted via cascade. This
            action cannot be undone.
          </>
        }
        confirmPhrase="PURGE INACTIVE"
        confirmHint="phrase"
        confirmLabel={
          isLoadingInactiveCount
            ? "Purge"
            : `Purge ${inactiveCount ?? 0} user(s)`
        }
        loading={purgeMutation.isPending}
        onConfirm={handlePurgeInactive}
      />
    </SuperAdminLayout>
  );
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm font-medium text-muted-foreground shrink-0">{label}</span>
      {children ?? <span className="text-sm text-right">{value}</span>}
    </div>
  );
}

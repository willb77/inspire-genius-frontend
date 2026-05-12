import { useState } from "react";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  usePrismList,
  useCreatePrism,
  useUpdatePrism,
  useDeletePrism,
} from "@/hooks/super-admin/prism/usePrism";
import type {
  PrismRow,
  PrismUpdateRequest,
} from "@/services/super-admin/prism/prism.service";

export default function PrismManagement() {
  const [search, setSearch] = useState("");
  const [editingRow, setEditingRow] = useState<PrismRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<PrismRow | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = usePrismList({ search: search || undefined });
  const createM = useCreatePrism();
  const updateM = useUpdatePrism();
  const deleteM = useDeletePrism();

  return (
    <SuperAdminLayout>
      <div className="container mx-auto py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">PRISM Management</h1>
            <p className="text-sm text-muted-foreground">
              View, edit, create, and delete PRISM assessment scores.
              Re-vectorization fires automatically on create + update.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4 mr-2" />
            New PRISM Row
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>PRISM Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search by user_id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs mb-4"
            />
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Gold</TableHead>
                    <TableHead>Green</TableHead>
                    <TableHead>Blue</TableHead>
                    <TableHead>Orange</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Assessed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.rows ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">
                        {row.user_id}
                      </TableCell>
                      <TableCell>{row.gold.toFixed(0)}</TableCell>
                      <TableCell>{row.green.toFixed(0)}</TableCell>
                      <TableCell>{row.blue.toFixed(0)}</TableCell>
                      <TableCell>{row.orange.toFixed(0)}</TableCell>
                      <TableCell>{row.version}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.assessed_at?.slice(0, 10) ?? "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingRow(row)}
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingRow(row)}
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(data?.rows ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                        No PRISM rows match this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Total: {data?.total ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create dialog */}
      <PrismCreateDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmit={(body) => {
          createM.mutate(body, {
            onSuccess: () => setCreating(false),
          });
        }}
        pending={createM.isPending}
      />

      {/* Edit dialog */}
      <PrismEditDialog
        row={editingRow}
        onOpenChange={(open) => !open && setEditingRow(null)}
        onSubmit={(body) => {
          if (editingRow) {
            updateM.mutate(
              { id: editingRow.id, body },
              { onSuccess: () => setEditingRow(null) },
            );
          }
        }}
        pending={updateM.isPending}
      />

      {/* Delete confirm */}
      <Dialog
        open={!!deletingRow}
        onOpenChange={(open) => !open && setDeletingRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete PRISM row?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently deletes the PRISM scores for user{" "}
            <span className="font-mono">{deletingRow?.user_id}</span> and
            removes the related document chunks from pgvector. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeletingRow(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteM.isPending}
              onClick={() => {
                if (deletingRow) {
                  deleteM.mutate(deletingRow.id, {
                    onSuccess: () => setDeletingRow(null),
                  });
                }
              }}
            >
              {deleteM.isPending && (
                <Loader2 className="size-4 animate-spin mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}

// ─── Create Dialog ──────────────────────────────────────────────────

function PrismCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (body: {
    user_id: string;
    gold: number;
    green: number;
    blue: number;
    orange: number;
  }) => void;
  pending: boolean;
}) {
  const [userId, setUserId] = useState("");
  const [gold, setGold] = useState(50);
  const [green, setGreen] = useState(50);
  const [blue, setBlue] = useState(50);
  const [orange, setOrange] = useState(50);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create PRISM Row</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="prism-user-id">User ID</Label>
            <Input
              id="prism-user-id"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="user UUID or email"
            />
          </div>
          {(
            [
              ["gold", gold, setGold],
              ["green", green, setGreen],
              ["blue", blue, setBlue],
              ["orange", orange, setOrange],
            ] as const
          ).map(([label, value, setter]) => (
            <div key={label} className="grid gap-2">
              <Label htmlFor={`prism-${label}`}>
                {label.charAt(0).toUpperCase() + label.slice(1)} (0–100)
              </Label>
              <Input
                id={`prism-${label}`}
                type="number"
                min={0}
                max={100}
                value={value}
                onChange={(e) => setter(Number(e.target.value))}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!userId.trim() || pending}
            onClick={() =>
              onSubmit({ user_id: userId.trim(), gold, green, blue, orange })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin mr-2" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Dialog ────────────────────────────────────────────────────

function PrismEditDialog({
  row,
  onOpenChange,
  onSubmit,
  pending,
}: {
  row: PrismRow | null;
  onOpenChange: (v: boolean) => void;
  onSubmit: (body: PrismUpdateRequest) => void;
  pending: boolean;
}) {
  const open = !!row;
  const [gold, setGold] = useState(row?.gold ?? 0);
  const [green, setGreen] = useState(row?.green ?? 0);
  const [blue, setBlue] = useState(row?.blue ?? 0);
  const [orange, setOrange] = useState(row?.orange ?? 0);

  // Reset when a new row is selected
  if (row && row.gold !== gold && row.id !== "init-sentinel") {
    setGold(row.gold);
    setGreen(row.green);
    setBlue(row.blue);
    setOrange(row.orange);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Edit PRISM for{" "}
            <span className="font-mono text-base">{row?.user_id}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {(
            [
              ["gold", gold, setGold],
              ["green", green, setGreen],
              ["blue", blue, setBlue],
              ["orange", orange, setOrange],
            ] as const
          ).map(([label, value, setter]) => (
            <div key={label} className="grid gap-2">
              <Label htmlFor={`edit-prism-${label}`}>
                {label.charAt(0).toUpperCase() + label.slice(1)} (0–100)
              </Label>
              <Input
                id={`edit-prism-${label}`}
                type="number"
                min={0}
                max={100}
                value={value}
                onChange={(e) => setter(Number(e.target.value))}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() => onSubmit({ gold, green, blue, orange })}
          >
            {pending && <Loader2 className="size-4 animate-spin mr-2" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

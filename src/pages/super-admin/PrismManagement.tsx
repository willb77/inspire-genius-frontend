import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useAuth } from "@/context/useAuth";
import { ROLES, ROUTES } from "@/constants/routes";

const SCORE_FIELDS = ["gold", "green", "blue", "orange"] as const;
type ScoreField = (typeof SCORE_FIELDS)[number];

export default function PrismManagement() {
  // Defense-in-depth: ProtectedRoute already enforces auth, but block
  // non-super-admin renders here as well.
  const { hasRole } = useAuth();
  if (!hasRole(ROLES.SUPER_ADMIN)) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <PrismManagementInner />;
}

function PrismManagementInner() {
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
              aria-label="Search PRISM rows by user_id"
            />
            {isLoading ? (
              <div
                role="status"
                aria-label="Loading PRISM rows"
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
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
                    <TableHead>Last Assessed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.rows ?? []).map((row) => (
                    <TableRow key={row.id} data-testid={`prism-row-${row.id}`}>
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
                          aria-label={`Edit PRISM row for ${row.user_id}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingRow(row)}
                          aria-label={`Delete PRISM row for ${row.user_id}`}
                        >
                          <Trash2 className="size-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(data?.rows ?? []).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-6"
                      >
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
      <AlertDialog
        open={!!deletingRow}
        onOpenChange={(open) => !open && setDeletingRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PRISM row?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the PRISM scores for user{" "}
              <span className="font-mono">{deletingRow?.user_id}</span> and
              removes the related document chunks from pgvector. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteM.isPending}
              onClick={(e) => {
                e.preventDefault();
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
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SuperAdminLayout>
  );
}

// ─── Score Slider Field ─────────────────────────────────────────────

function ScoreSlider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label} (0–100)</Label>
        <span
          className="text-sm font-mono tabular-nums"
          data-testid={`score-${id}-value`}
        >
          {value}
        </span>
      </div>
      <Slider
        id={id}
        aria-label={`${label} score`}
        min={0}
        max={100}
        step={1}
        value={[value]}
        onValueChange={(values) => onChange(values[0] ?? 0)}
      />
    </div>
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
  const [scores, setScores] = useState<Record<ScoreField, number>>({
    gold: 50,
    green: 50,
    blue: 50,
    orange: 50,
  });

  // Reset to defaults whenever the dialog reopens
  useEffect(() => {
    if (open) {
      setUserId("");
      setScores({ gold: 50, green: 50, blue: 50, orange: 50 });
    }
  }, [open]);

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
          {SCORE_FIELDS.map((field) => (
            <ScoreSlider
              key={field}
              id={`prism-${field}`}
              label={field.charAt(0).toUpperCase() + field.slice(1)}
              value={scores[field]}
              onChange={(next) =>
                setScores((prev) => ({ ...prev, [field]: next }))
              }
            />
          ))}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!userId.trim() || pending}
            onClick={() =>
              onSubmit({
                user_id: userId.trim(),
                gold: scores.gold,
                green: scores.green,
                blue: scores.blue,
                orange: scores.orange,
              })
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
  const [scores, setScores] = useState<Record<ScoreField, number>>({
    gold: 0,
    green: 0,
    blue: 0,
    orange: 0,
  });

  // Sync local state whenever a new row is selected
  useEffect(() => {
    if (row) {
      setScores({
        gold: row.gold,
        green: row.green,
        blue: row.blue,
        orange: row.orange,
      });
    }
  }, [row]);

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
          <div className="grid gap-2">
            <Label>User</Label>
            <Input value={row?.user_id ?? ""} readOnly disabled />
          </div>
          {SCORE_FIELDS.map((field) => (
            <ScoreSlider
              key={field}
              id={`edit-prism-${field}`}
              label={field.charAt(0).toUpperCase() + field.slice(1)}
              value={scores[field]}
              onChange={(next) =>
                setScores((prev) => ({ ...prev, [field]: next }))
              }
            />
          ))}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              onSubmit({
                gold: scores.gold,
                green: scores.green,
                blue: scores.blue,
                orange: scores.orange,
              })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin mr-2" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateOrg } from "@/hooks/super-admin/organization-management/useOrganizationManagement";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

/**
 * Create an organization through org-service (POST /v1/orgs).
 *
 * Name only: `public.organization` has no admin, licence or coach columns, and
 * the routes that used to take those (the monolith's /v1/organizations and
 * /v1/licenses) answer on no tier. Members are added from the organization's
 * page or from User Management.
 */
export default function CreateOrganizationDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateOrganizationDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useCreateOrg({
    onSuccess: (org) => {
      toast.success(`Organization "${org?.name ?? name.trim()}" created`);
      setName("");
      setError(null);
      onOpenChange(false);
      onCreated?.();
    },
    onError: (err) => {
      setError(
        err.response?.data?.detail || err.message || "Couldn't create the organization"
      );
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter a name");
      return;
    }
    setError(null);
    mutate(name);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
            <DialogDescription>
              Add members afterwards from the organization&apos;s page or from User Management.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-org-name">Organization name</Label>
            <Input
              id="new-org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              autoFocus
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import ModalFormFrame from "@/components/shared/forms/ModalFormFrame";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  User_FORM_DEFAULTS,
  User_FORM_RULES,
  type UserFormValues,
} from "./userForm.constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES } from "@/constants/routes";
import { ROLE_LABELS } from "@/types/roles";
import {
  useUserInvitation,
  useUpdateInvitationExpiry,
  useResendInvitation,
} from "@/hooks/super-admin/user-management/useUserManagement";

export type InvitationContext = {
  userId: string;
  invitationId: string;
  invitationStatus: string;
};

export type UserFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  mode: "add" | "edit";
  defaultValues?: Partial<UserFormValues>;
  onSubmit: (values: UserFormValues) => void | Promise<void>;
  submitLabel?: string;
  allowStatusEdit?: boolean;
  /**
   * When set in edit mode AND the user has an invitation (pending/expired),
   * renders the invitation lifecycle controls (status, expiry, resend).
   */
  invitationContext?: InvitationContext;
};

const INVITATION_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-700 border-transparent",
  },
  invitation_sent: {
    label: "Sent",
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
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-200 text-gray-700 border-transparent",
  },
};

function InvitationSection({
  context,
}: {
  context: InvitationContext;
}) {
  // Fetch on mount; the query is gated on enabled=true here because the
  // parent only renders InvitationSection when the user actually has an
  // invitation (so the gate at the hook level is just defense-in-depth).
  const { data, isLoading, isError, error } = useUserInvitation(
    context.userId,
    true,
  );
  const updateExpiry = useUpdateInvitationExpiry();
  const resend = useResendInvitation();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    undefined,
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Min selectable date = tomorrow (UTC). Past + today are disabled.
  const minDate = new Date();
  minDate.setUTCHours(0, 0, 0, 0);
  minDate.setUTCDate(minDate.getUTCDate() + 1);

  const handleUpdateExpiry = async () => {
    if (!selectedDate) return;
    // Transmit as ISO 8601 UTC — the backend requires future and stores UTC.
    await updateExpiry.mutateAsync({
      userId: context.userId,
      expires_at: selectedDate.toISOString(),
    });
    setSelectedDate(undefined);
  };

  const handleResend = async () => {
    await resend.mutateAsync(context.invitationId);
  };

  const statusKey = (data?.status ?? context.invitationStatus ?? "").toLowerCase();
  const badge = INVITATION_STATUS_BADGES[statusKey];

  return (
    <div className="md:col-span-2 mt-2 rounded-md border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Invitation</h3>
        {badge ? (
          <Badge variant="secondary" className={badge.className}>
            {badge.label}
          </Badge>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading invitation details…
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {(error as { response?: { data?: { message?: string } } } | undefined)?.response?.data
            ?.message ?? "Failed to load invitation details"}
        </p>
      ) : data ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="text-foreground">{data.email}</dd>

          <dt className="text-muted-foreground">Role</dt>
          <dd className="text-foreground">{data.role ?? "—"}</dd>

          <dt className="text-muted-foreground">Sent</dt>
          <dd className="text-foreground">
            {data.sent_at
              ? format(new Date(data.sent_at), "d LLL yyyy, HH:mm")
              : "—"}
          </dd>

          <dt className="text-muted-foreground">Expires</dt>
          <dd className="text-foreground">
            {data.expires_at
              ? format(new Date(data.expires_at), "d LLL yyyy, HH:mm")
              : "—"}
          </dd>
        </dl>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="invitation-new-expiry"
            className="block text-xs mb-1 text-muted-foreground"
          >
            Set new expiry
          </label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                id="invitation-new-expiry"
                type="button"
                variant="outline"
                className="w-full justify-start font-normal"
                disabled={updateExpiry.isPending}
              >
                <CalendarIcon className="mr-2 size-4" aria-hidden="true" />
                {selectedDate
                  ? format(selectedDate, "d LLL yyyy")
                  : "Pick a future date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d ?? undefined);
                  if (d) setCalendarOpen(false);
                }}
                disabled={{ before: minDate }}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button
          type="button"
          onClick={handleUpdateExpiry}
          disabled={!selectedDate || updateExpiry.isPending}
        >
          {updateExpiry.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Updating…
            </>
          ) : (
            "Update Expiry"
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleResend}
          disabled={resend.isPending}
        >
          {resend.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Resending…
            </>
          ) : (
            "Resend Invitation"
          )}
        </Button>
      </div>
    </div>
  );
}

export default function UserFormModal({
  open,
  onOpenChange,
  title,
  mode,
  defaultValues = {},
  onSubmit,
  submitLabel,
  allowStatusEdit,
  invitationContext,
}: UserFormModalProps) {
  const defaultValuesMerged: UserFormValues = {
    ...User_FORM_DEFAULTS,
    ...defaultValues,
  };

  // Bundle 2 (2026-05-28): widened the gate so the expiry input is visible
  // for accepted invitations too — admins re-issuing access to an active
  // user need to set a future expiry to satisfy the resend-invitation flow.
  // Pre-cutover the input was unconditionally visible; this restores parity
  // for any user with an invitation row, regardless of status. Users with
  // no invitation_id at all (legacy / Path-B-seeded) still don't see it.
  const showInvitationSection =
    mode === "edit" &&
    !!invitationContext &&
    !!invitationContext.invitationId;

  return (
    <ModalFormFrame<UserFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? (mode === "add" ? "Add User" : "Edit User")}
      mode={mode}
      defaultValues={defaultValuesMerged}
      submitLabel={
        submitLabel ?? (mode === "add" ? "Add User" : "Save Changes")
      }
      onSubmit={onSubmit}
    >
      {({ control }) => (
        <>
          <FormField
            control={control}
            name="first_name"
            rules={User_FORM_RULES.first_name}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-xs">First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter First Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="last_name"
            rules={User_FORM_RULES.last_name}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-xs">Last Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Last Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
              control={control}
              name="email"
              rules={User_FORM_RULES.email}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-xs">Email *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter Email"
                      readOnly={mode === "edit"}
                      className={
                        mode === "edit" ? "bg-gray-100 cursor-not-allowed" : ""
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          <FormField
            control={control}
            name="role"
            rules={User_FORM_RULES.role}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-xs">Role *</FormLabel>
                <FormControl>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {[ROLES.USER, ROLES.MANAGER, ROLES.COMPANY_ADMIN, ROLES.PRACTITIONER, ROLES.DISTRIBUTOR, ROLES.SUPER_ADMIN].map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role] ?? role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === "add" && (
            <FormField
              control={control}
              name="skip_onboarding"
              rules={User_FORM_RULES.skip_onboarding}
              render={({ field }) => (
                <FormItem className="md:col-span-2 rounded-md border border-border bg-muted/30 p-3">
                  <div className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(v) => field.onChange(v === true)}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-tight">
                      <FormLabel className="text-sm font-medium">
                        Skip onboarding process
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Provisions the user already onboarded and emails a
                        one-click magic sign-in link instead of a password-setup
                        invitation. For demo accounts on Dev/Staging — ignored
                        (rejected) in production.
                      </p>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {mode === "edit" && allowStatusEdit !== false && (
            <FormField
              control={control}
              name="status"
              rules={User_FORM_RULES.status}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-xs">Status</FormLabel>
                  <FormControl>
                    <Select
                      value={String(field.value || "Active")}
                      onValueChange={(v) =>
                        field.onChange(v as UserFormValues["status"])
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Deactivated">Deactivated</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {showInvitationSection && invitationContext ? (
            <InvitationSection context={invitationContext} />
          ) : null}
        </>
      )}
    </ModalFormFrame>
  );
}

"use client";

import ModalFormFrame from "@/components/shared/forms/ModalFormFrame";
import { Input } from "@/components/ui/input";
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

export type UserFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  mode: "add" | "edit";
  defaultValues?: Partial<UserFormValues>;
  onSubmit: (values: UserFormValues) => void | Promise<void>;
  submitLabel?: string;
  allowStatusEdit?: boolean;
};

export default function UserFormModal({
  open,
  onOpenChange,
  title,
  mode,
  defaultValues = {},
  onSubmit,
  submitLabel,
  allowStatusEdit,
}: UserFormModalProps) {
  const defaultValuesMerged: UserFormValues = {
    ...User_FORM_DEFAULTS,
    ...defaultValues,
  };

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
                      {Object.values(ROLES).map((role) => (
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

        </>
      )}
    </ModalFormFrame>
  );
}

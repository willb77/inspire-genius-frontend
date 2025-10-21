"use client";

import React from "react";
import ModalDialog from "@/components/shared/ModalDialog";
import { useForm } from "react-hook-form";
import ModalFormFooter from "@/components/shared/forms/ModalFormFooter";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TEAM_FORM_DEFAULTS, TEAM_FORM_RULES, TEAM_ROLES, type TeamFormValues } from "./teamForm.constants";

export type TeamFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  mode: "add" | "edit";
  defaultValues?: Partial<TeamFormValues>;
  onSubmit: (values: TeamFormValues) => void | Promise<void>;
  submitLabel?: string;
};

export default function TeamFormModal({
  open,
  onOpenChange,
  title,
  mode,
  defaultValues,
  onSubmit,
  submitLabel,
}: TeamFormModalProps) {
  const form = useForm<TeamFormValues>({
    defaultValues: { ...TEAM_FORM_DEFAULTS, ...(defaultValues ?? {}) },
    mode: "onTouched",
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ ...TEAM_FORM_DEFAULTS, ...(defaultValues ?? {}) });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    onOpenChange(false);
  });

  const footer = (
    <ModalFormFooter
      onCancel={() => onOpenChange(false)}
      onSubmit={handleSubmit}
      isSubmitting={form.formState.isSubmitting}
      submitLabel={submitLabel ?? (mode === "add" ? "Add User" : "Save Changes")}
    />
  );

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? (mode === "add" ? "Add User" : "Edit User")}
      footer={footer}
    >
      <Form {...form}>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e) => e.preventDefault()}>
          <FormField
            control={form.control}
            name="name"
            rules={TEAM_FORM_RULES.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-xs">Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            rules={TEAM_FORM_RULES.email}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-xs">Email *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            rules={TEAM_FORM_RULES.role}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-xs">Role *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === "edit" && (
            <FormField
              control={form.control}
              name="status"
              rules={TEAM_FORM_RULES.status}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-xs">Status</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Status" />
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
        </form>
      </Form>
    </ModalDialog>
  );
}

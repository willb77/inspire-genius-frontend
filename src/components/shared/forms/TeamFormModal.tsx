"use client";

import { useTranslation } from "react-i18next";
import ModalFormFrame from "@/components/shared/forms/ModalFormFrame";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  const { t } = useTranslation("shellUi");
  const dv: TeamFormValues = { ...TEAM_FORM_DEFAULTS, ...(defaultValues ?? {}) } as TeamFormValues;

  return (
    <ModalFormFrame<TeamFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? (mode === "add" ? t("teamForm.addUser", { defaultValue: "Add User" }) : t("teamForm.editUser", { defaultValue: "Edit User" }))}
      mode={mode}
      defaultValues={dv}
      submitLabel={submitLabel ?? (mode === "add" ? t("teamForm.addUser", { defaultValue: "Add User" }) : t("teamForm.saveChanges", { defaultValue: "Save Changes" }))}
      onSubmit={onSubmit}
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            rules={TEAM_FORM_RULES.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-xs">{t("teamForm.name", { defaultValue: "Name *" })}</FormLabel>
                <FormControl>
                  <Input placeholder={t("teamForm.namePlaceholder", { defaultValue: "Enter Name" })} {...field} />
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
                <FormLabel className="block text-xs">{t("teamForm.email", { defaultValue: "Email *" })}</FormLabel>
                <FormControl>
                  <Input placeholder={t("teamForm.emailPlaceholder", { defaultValue: "Enter Email" })} {...field} />
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
                <FormLabel className="block text-xs">{t("teamForm.role", { defaultValue: "Role *" })}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("teamForm.selectRole", { defaultValue: "Select Role" })} />
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
                  <FormLabel className="block text-xs">{t("teamForm.status", { defaultValue: "Status" })}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("teamForm.selectStatus", { defaultValue: "Select Status" })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">{t("teamForm.active", { defaultValue: "Active" })}</SelectItem>
                        <SelectItem value="Deactivated">{t("teamForm.deactivated", { defaultValue: "Deactivated" })}</SelectItem>
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

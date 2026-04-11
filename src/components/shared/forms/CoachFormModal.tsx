"use client";

import ModalFormFrame from "@/components/shared/forms/ModalFormFrame";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { COACH_FORM_DEFAULTS, COACH_FORM_RULES, type CoachFormValues } from "./coachForm.constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MultiSelectOption } from "@/components/ui/multi-select";

export type CoachFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  mode: "add" | "edit";
  defaultValues?: Partial<CoachFormValues>;
  onSubmit: (values: CoachFormValues) => void | Promise<void>;
  submitLabel?: string;
  toneOptions?: MultiSelectOption[];
};

export default function CoachFormModal({
  open,
  onOpenChange,
  title,
  mode,
  defaultValues,
  onSubmit,
  submitLabel,
  toneOptions = [],
}: CoachFormModalProps) {
  const dv: CoachFormValues = { ...COACH_FORM_DEFAULTS, ...(defaultValues ?? {}) } as CoachFormValues;

  return (
    <ModalFormFrame<CoachFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? (mode === "add" ? "Add Mentor" : "Edit Mentor")}
      mode={mode}
      defaultValues={dv}
      submitLabel={submitLabel ?? (mode === "add" ? "Add Mentor" : "Save Changes")}
      onSubmit={onSubmit}
      className="sm:max-w-2xl"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            rules={COACH_FORM_RULES.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-xs">Mentor Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Name" disabled={mode === "edit"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            rules={COACH_FORM_RULES.category}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-xs">Category *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Category" disabled={mode === "edit"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === "edit" && (
            <FormField
              control={form.control}
              name="status"
              rules={COACH_FORM_RULES.status}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-xs">Status</FormLabel>
                  <FormControl>
                    <Select value={String(field.value || "active")} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="deactivated">Deactivated</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="persona"
            rules={COACH_FORM_RULES.persona}
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="block text-xs">Persona</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Define the mentor's personality, communication style, and approach (e.g. empathetic listener, direct challenger, supportive guide)"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === "edit" && toneOptions.length > 0 && (
            <FormField
              control={form.control}
              name="voice_style"
              rules={COACH_FORM_RULES.voice_style}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-xs">Voice Style</FormLabel>
                  <FormControl>
                    <Select
                      value={String(field.value || "")}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select voice style" />
                      </SelectTrigger>
                      <SelectContent>
                        {toneOptions.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="voice_description"
            rules={COACH_FORM_RULES.voice_description}
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="block text-xs">System Prompt</FormLabel>
                <FormControl>
                  <Textarea
                    rows={6}
                    placeholder="Enter the system prompt that defines how this mentor behaves, responds, and coaches users"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </ModalFormFrame>
  );
}

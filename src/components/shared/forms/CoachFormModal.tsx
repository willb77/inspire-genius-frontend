"use client";
import ModalFormFrame from "@/components/shared/forms/ModalFormFrame";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { COACH_FORM_DEFAULTS, COACH_FORM_RULES, type CoachFormValues } from "./coachForm.constants";

export type CoachFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  mode: "add" | "edit";
  defaultValues?: Partial<CoachFormValues>;
  onSubmit: (values: CoachFormValues) => void | Promise<void>;
  submitLabel?: string;
};

export default function CoachFormModal({
  open,
  onOpenChange,
  title,
  mode,
  defaultValues,
  onSubmit,
  submitLabel,
}: CoachFormModalProps) {
  const dv: CoachFormValues = { ...COACH_FORM_DEFAULTS, ...(defaultValues ?? {}) } as CoachFormValues;

  return (
    <ModalFormFrame<CoachFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? (mode === "add" ? "Add Coach" : "Edit Coach")}
      mode={mode}
      defaultValues={dv}
      submitLabel={submitLabel ?? (mode === "add" ? "Add Coach" : "Save Changes")}
      onSubmit={onSubmit}
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            rules={COACH_FORM_RULES.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-xs">Coach Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Name" {...field} />
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
                  <Input placeholder="Enter Category" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="voice_style"
            rules={COACH_FORM_RULES.voice_style}
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="block text-xs">Voice Style</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Calm, Motivation" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="voice_description"
            rules={COACH_FORM_RULES.voice_description}
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="block text-xs">Description</FormLabel>
                <FormControl>
                  <Textarea rows={6} placeholder="Describe the coach" {...field} />
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

"use client";

import ModalFormFrame from "@/components/shared/forms/ModalFormFrame";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { COACH_FORM_DEFAULTS, COACH_FORM_RULES, type CoachFormValues } from "./coachForm.constants";
// import { MultiSelect } from "@/components/ui/multi-select";
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
  // toneOptions = [],
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
{/* 
          <FormField
            control={form.control}
            name="voice_style"
            rules={COACH_FORM_RULES.voice_style}
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="block text-xs">Voice Style</FormLabel>
                <FormControl>
                  <MultiSelect
                    value={String(field.value || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)}
                    onChange={(vals) => field.onChange(vals.join(", "))}
                    options={toneOptions}
                    placeholder="Select voice styles"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          /> */}

          {mode === "edit" ? (
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
          ) : null}

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

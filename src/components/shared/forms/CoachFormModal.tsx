"use client";

import React from "react";
import ModalDialog from "@/components/shared/ModalDialog";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  const form = useForm<CoachFormValues>({
    defaultValues: { ...COACH_FORM_DEFAULTS, ...(defaultValues ?? {}) },
    mode: "onTouched",
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ ...COACH_FORM_DEFAULTS, ...(defaultValues ?? {}) });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    onOpenChange(false);
  });

  const footer = (
    <>
      <Button
        variant="secondary"
        className="bg-gray-100 hover:bg-gray-100 text-foreground"
        onClick={() => onOpenChange(false)}
        type="button"
      >
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={form.formState.isSubmitting} type="button">
        {submitLabel ?? (mode === "add" ? "Add Coach" : "Save Changes")}
      </Button>
    </>
  );

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? (mode === "add" ? "Add Coach" : "Edit Coach")}
      footer={footer}
    >
      <Form {...form}>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e) => e.preventDefault()}>
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
        </form>
      </Form>
    </ModalDialog>
  );
}

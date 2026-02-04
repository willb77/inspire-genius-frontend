"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import type { UseFormReturn } from "react-hook-form";
import type { OrganizationFormData } from "@/types/super-admin/organization/form-types";
import { ORGANIZATION_FORM_RULES } from "@/components/shared/forms/organizationForm.constants";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  form: UseFormReturn<OrganizationFormData>;
};

export default function OrganizationInfoStep({ form }: Props) {
  const { watch, setValue } = form;
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue("logo", file);
    }
  };

  const removeFile = useCallback(() => {
    setValue("logo", null);
  }, [setValue]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        setValue("logo", file);
      }
    },
    [setValue]
  );

  const logo = watch("logo");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="organization_name"
          rules={ORGANIZATION_FORM_RULES.organization_name}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">
                Organization Name *
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter Organization Name"
                  className="text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contact"
          rules={ORGANIZATION_FORM_RULES.contact}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">Contact *</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="Enter Contact Number"
                  className="text-sm"
                  maxLength={10}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          rules={ORGANIZATION_FORM_RULES.type as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">
                Organization Type *
              </FormLabel>
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">Website URL</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="www.example.com"
                  className="text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col">
          <FormField
            control={form.control}
            name="address"
            rules={ORGANIZATION_FORM_RULES.address}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Address *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter Address"
                    className="text-sm min-h-[121px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <FormLabel className="text-xs font-medium">Add Logo</FormLabel>
          <div
            className={`rounded-lg border-2 border-dashed transition-colors h-[121px] ${
              dragOver ? "border-blue-400 bg-blue-50/40" : "border-gray-300"
            } p-4 sm:p-6`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center text-center gap-2 h-full">
              <Upload className="w-6 h-6 text-blue-500" />
              <div className="text-sm text-gray-600">Drag & drop logo here</div>
              <div className="text-xs text-gray-500">OR</div>
              <div className="flex flex-col items-center">
                <Button type="button" size="sm" onClick={handleFileSelect}>
                  Browse files
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*"
                />
              </div>
            </div>
          </div>

          {logo && (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <span className="inline-flex items-center justify-center w-7 h-5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                IMG
              </span>
              <div className="flex-1 text-sm truncate">{logo.name}</div>
              <div className="text-xs text-gray-500">
                {(logo.size / 1024).toFixed(1)} KB
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 h-auto p-1"
                onClick={removeFile}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

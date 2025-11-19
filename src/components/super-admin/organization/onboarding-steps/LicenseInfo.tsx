import { useState } from "react";
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
import DatePickerButton from "@/components/shared/DatePickerButton";
import type { UseFormReturn } from "react-hook-form";
import type { OrganizationFormData } from "@/types/super-admin/organization";
import { LICENSE_TYPES, ORGANIZATION_FORM_RULES } from "@/components/shared/forms/organizationForm.constants";

type Props = {
  form: UseFormReturn<OrganizationFormData>;
};

export default function LicenseInfoStep({ form }: Props) {
  const [licenseStartDate, setLicenseStartDate] = useState<Date | undefined>(
    undefined
  );
  const [licenseEndDate, setLicenseEndDate] = useState<Date | undefined>(
    undefined
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        {/* Subscription Tier */}
        <FormField
          control={form.control}
          name="license_type"
          rules={ORGANIZATION_FORM_RULES.license_type}
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="mb-2 block text-xs">
                Subscription Tier *
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Tier" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LICENSE_TYPES.map((type) => (
                    <SelectItem
                      key={type.toLowerCase()}
                      value={type.toLowerCase()}
                    >
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* License Start Date */}
        <FormField
          control={form.control}
          name="license_start_date"
          rules={ORGANIZATION_FORM_RULES.license_start_date}
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="mb-2 block text-xs">
                License Start Date *
              </FormLabel>
              <FormControl>
                <DatePickerButton
                  date={licenseStartDate}
                  onSelect={(date) => {
                    setLicenseStartDate(date);
                    if (date) {
                      field.onChange(date.toISOString());
                      if (licenseEndDate && date > licenseEndDate) {
                        setLicenseEndDate(date);
                        form.setValue("license_end_date", date.toISOString());
                      }
                    } else {
                      field.onChange("");
                    }
                  }}
                  placeholder="Select start date"
                  disabled={(date) =>
                    licenseEndDate ? date > licenseEndDate : false
                  }
                  formatStr="dd-MM-yyyy"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* License End Date */}
        <FormField
          control={form.control}
          name="license_end_date"
          rules={ORGANIZATION_FORM_RULES.license_end_date}
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="mb-2 block text-xs">
                License End Date *
              </FormLabel>
              <FormControl>
                <DatePickerButton
                  date={licenseEndDate}
                  onSelect={(date) => {
                    setLicenseEndDate(date);
                    if (date) {
                      field.onChange(date.toISOString());
                    } else {
                      field.onChange("");
                    }
                  }}
                  placeholder="Select end date"
                  disabled={(date) =>
                    licenseStartDate ? date < licenseStartDate : false
                  }
                  formatStr="dd-MM-yyyy"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

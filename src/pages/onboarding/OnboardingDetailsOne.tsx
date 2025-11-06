import ProgressBar from "@/components/onboarding/ProgressBar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/shared/Logo";
import { format, parse, isValid } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import type { FormValues } from "@/types/onboarding";
import { useCreateProfileMutation } from "@/hooks/onboarding/useCreateProfile";

export default function OnboardingDetailsOne() {
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      dob: "",
      about: "",
    },
    mode: "onTouched",
  });

  const createProfile = useCreateProfileMutation({
    onSuccess: () => {
      navigate(ROUTES.ONBOARDING_DETAILS.TWO, { replace: true });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!values.firstName || !values.lastName || !values.dob) return;
    const parsed = parse(values.dob, "d LLL yyyy", new Date());
    const yyyyMmDd = isValid(parsed) ? format(parsed, "yyyy-MM-dd") : "";
    if (!yyyyMmDd) return;
    createProfile.mutate({
      first_name: values.firstName,
      last_name: values.lastName,
      date_of_birth: yyyyMmDd,
      additional_info: values.about?.trim() ? values.about : undefined,
    });
  };

  return (
    <div data-tour="onboarding-details-one" className="min-h-screen w-full flex flex-col items-center justify-center p-4">
      <div className="w-full">
        <Logo />
      </div>
      <div className="w-full max-w-2xl space-y-6">
        <ProgressBar current={1} total={2} />

        <div className="bg-white rounded-2xl shadow-[4px_4px_20px_4px_rgba(0,0,0,0.1)] p-6 md:p-8">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-semibold">Tell us more about you</h2>
            <p className="text-sm text-muted-foreground">
              Fill the forms below to add your details.
            </p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* First Name */}
              <FormField
                control={form.control}
                name="firstName"
                rules={{
                  required: "First name is required",
                  minLength: { value: 2, message: "First name must be at least 2 characters" },
                  pattern: { value: /^[A-Za-z][A-Za-z\s'-]*$/, message: "Only letters, spaces, hyphen and apostrophe allowed" },
                }}
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="First Name"
                        className="peer h-11 w-full rounded-md border border-gray-10 bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Last Name */}
              <FormField
                control={form.control}
                name="lastName"
                rules={{
                  required: "Last name is required",
                  minLength: { value: 1, message: "Last name must be at least 1 character" },
                  pattern: { value: /^[A-Za-z][A-Za-z\s'-]*$/, message: "Only letters, spaces, hyphen and apostrophe allowed" },
                }}
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Last Name"
                        className="peer h-11 w-full rounded-md border border-gray-10 bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date of Birth */}
              <FormField
                control={form.control}
                name="dob"
                rules={{
                  required: "Date of birth is required",
                  validate: (v: string) => {
                    const d = parse(v, "d LLL yyyy", new Date());
                    if (!isValid(d)) return "Invalid date";
                    const today = new Date();
                    const cutoff = new Date(
                      today.getFullYear() - 13,
                      today.getMonth(),
                      today.getDate()
                    );
                    cutoff.setHours(0, 0, 0, 0);
                    d.setHours(0, 0, 0, 0);
                    if (d > cutoff) return "You must be at least 13 years old";
                    return true;
                  },
                }}
                render={({ field }) => (
                  <FormItem className="relative w-full">
                    <DatePicker
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                      }}
                      placeholder="Date of Birth"
                      minDate={new Date(1900, 0, 1)}
                      maxDate={(() => { const t=new Date(); return new Date(t.getFullYear()-13, t.getMonth(), t.getDate()); })()}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* About */}
              <FormField
                control={form.control}
                name="about"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 col-span-1 relative">
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Tell us more about you (optional)"
                        className="min-h-24 w-full rounded-md border border-gray-10 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="md:col-span-2 col-span-1 mt-2 flex justify-end">
                <Button type="submit" className="h-11 w-52" disabled={createProfile.isPending}>
                  Next
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

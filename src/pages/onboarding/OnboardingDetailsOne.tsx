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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/shared/Logo";

export default function OnboardingDetailsOne() {
  const navigate = useNavigate();
  type FormValues = {
    firstName: string;
    lastName: string;
    dob: string;
    category: string;
    role: string;
    about?: string;
  };

  const form = useForm<FormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      dob: "",
      category: "",
      role: "",
      about: "",
    },
    mode: "onTouched",
  });

  const onSubmit = (values: FormValues) => {
    // Basic validation safeguard (react-hook-form already enforces rules)
    if (
      !values.firstName ||
      !values.lastName ||
      !values.dob ||
      !values.category ||
      !values.role
    )
      return;
    navigate(ROUTES.ONBOARDING_DETAILS.TWO);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
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
                rules={{ required: "First name is required" }}
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
                rules={{ required: "Last name is required" }}
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
                rules={{ required: "Date of birth is required" }}
                render={({ field }) => (
                  <FormItem className="relative w-full">
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.currentTarget.value)}
                        className="block h-11 w-full min-w-0 rounded-md border border-gray-10 bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                rules={{ required: "Category is required" }}
                render={({ field }) => (
                  <FormItem className="relative">
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="!h-11 w-full rounded-md border border-gray-10">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Role */}
              <FormField
                control={form.control}
                name="role"
                rules={{ required: "Role is required" }}
                render={({ field }) => (
                  <FormItem className="relative md:col-span-2 col-span-1">
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="!h-11 w-full rounded-md border border-gray-10">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="hr">
                          Human Resource Manager
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                <Button type="submit" className="h-11 w-52">
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

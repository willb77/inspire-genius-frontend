import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Send } from "lucide-react";
import type { HelpFormValues, HelpFormProps } from "@/types/help";

export default function HelpForm({ onSubmit }: HelpFormProps) {
  const MAX_CHARS = 500;
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<HelpFormValues>({
    defaultValues: {
      firstName: "",
      email: "",
      message: "",
      agree: false,
    },
    mode: "onTouched",
  });

  const { watch } = form;
  const messageValue = watch("message");
  const charsLeft = Math.max(0, MAX_CHARS - (messageValue?.length || 0));

  const onCancel = () => {
    form.reset();
  };

  const handleSubmit = async (values: HelpFormValues) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="shadow-none sm:shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="text-base font-medium tracking-tight">
          Get assistance and resolve issues with ease.
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-left">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                rules={{ required: "First name is required" }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-2 block text-xs">
                      Your Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="First Name"
                        {...field}
                        aria-describedby="firstName-help"
                      />
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                rules={{ 
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Please enter a valid email address"
                  }
                }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-2 block text-xs">Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Email Address"
                        type="email"
                        {...field}
                        aria-describedby="email-help"
                      />
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="message"
              rules={{ 
                required: "Message is required",
                maxLength: {
                  value: MAX_CHARS,
                  message: `Message must be ${MAX_CHARS} characters or less`
                }
              }}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="mb-2 block text-xs text-black-250">
                      Message
                    </FormLabel>
                    <span
                      className="text-[11px] text-gray-400"
                      aria-live="polite"
                    >
                      {MAX_CHARS - charsLeft}/{MAX_CHARS}
                    </span>
                  </div>
                  <FormControl>
                    <textarea
                      placeholder="Enter your message"
                      rows={6}
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.slice(0, MAX_CHARS))
                      }
                      aria-describedby="message-help"
                      className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agree"
              rules={{ 
                required: "You must agree to the terms and privacy policy"
              }}
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <FormLabel className="text-muted-foreground text-sm leading-snug">
                      I agree with the{" "}
                      <a
                        href="/terms"
                        className="text-blue-500 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Terms of Use
                      </a>{" "}
                      &{" "}
                      <a
                        href="/privacy"
                        className="text-blue-500 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Privacy Policy
                      </a>
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CardFooter className="flex flex-col sm:flex-row items-center gap-3 justify-end p-0">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
                className="w-full sm:w-52 bg-gray-20"
                type="button"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-52"
              >
                {submitting ? (
                  "Sending…"
                ) : (
                  <>
                    Send
                    <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

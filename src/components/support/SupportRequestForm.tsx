import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ImagePlus, Send, X } from "lucide-react";
import {
  DESCRIPTION_PROMPTS,
  MAX_DESCRIPTION_CHARS,
  MIN_DESCRIPTION_CHARS,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  type SupportRequestFormProps,
  type SupportRequestValues,
} from "@/types/support/component-types";

/** Matches the server's per-file ceiling (support-service max_attachment_bytes). */
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const MAX_SCREENSHOTS = 5;

export default function SupportRequestForm({
  form,
  onSubmit,
  isSubmitting,
  screenshots = [],
  onScreenshotsChange,
}: SupportRequestFormProps) {
  const description = form.watch("description") ?? "";
  const used = description.length;
  const remainingToMinimum = Math.max(0, MIN_DESCRIPTION_CHARS - used);

  const handleSubmit = async (values: SupportRequestValues) => {
    await onSubmit(values);
  };

  return (
    <Card className="shadow-none sm:shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="text-base font-medium tracking-tight">
          Post a support request
        </CardTitle>
        <CardDescription>
          Tell us what is going wrong and we will get back to you. The more
          detail you give, the faster we can help.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 text-left">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* ── Contact block ───────────────────────────────────────── */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">
                  Your contact details
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sent with your request so we can reply directly. Prefilled
                  from your account — edit if you would rather we used something
                  else.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="mb-2 block text-xs">
                        Full name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <div className="min-h-[20px]">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="mb-2 block text-xs">
                        Email address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          {...field}
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
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="mb-2 block text-xs">
                        Phone (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1 555 0100"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <div className="min-h-[20px]">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ── Request block ───────────────────────────────────────── */}
            <div className="space-y-4 border-t pt-5">
              <h3 className="text-sm font-semibold tracking-tight">
                About the issue
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="mb-2 block text-xs">
                        What is this about?
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SUPPORT_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="min-h-[20px]">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="mb-2 block text-xs">
                        How urgent is it?
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Select a priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SUPPORT_PRIORITIES.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="min-h-[20px]">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="mb-2 block text-xs">
                        Subject
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Short summary of the problem"
                          {...field}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="mb-2 block text-xs">
                        Describe the issue in detail
                      </FormLabel>
                      <span
                        className="text-[11px] text-muted-foreground"
                        aria-live="polite"
                      >
                        {used}/{MAX_DESCRIPTION_CHARS}
                        {remainingToMinimum > 0
                          ? ` — ${remainingToMinimum} more to go`
                          : null}
                      </span>
                    </div>
                    <FormControl>
                      <Textarea
                        rows={8}
                        placeholder={
                          "Please describe the issue in detail. For example:\n" +
                          DESCRIPTION_PROMPTS.map((p) => `• ${p}`).join("\n")
                        }
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value.slice(0, MAX_DESCRIPTION_CHARS),
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription className="pt-1">
                      Helpful things to include:{" "}
                      {DESCRIPTION_PROMPTS.join(" ")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Screenshots. Validated here against the SAME limits the server
                enforces, so an oversized file is refused before the user waits
                on an upload that would be rejected. The client check is a
                courtesy, not the boundary — support-service re-checks type and
                size before issuing any presigned URL. */}
            {onScreenshotsChange && (
              <div className="mt-4 text-left">
                <div className="text-sm font-medium mb-1">
                  Screenshots{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Images only, up to {MAX_SCREENSHOTS} files, 10&nbsp;MB each. A
                  picture of the screen you are describing usually resolves a
                  request faster than any description.
                </p>

                <label
                  htmlFor="support-screenshots"
                  className="inline-flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                >
                  <ImagePlus className="h-4 w-4" />
                  Add screenshots
                </label>
                <input
                  id="support-screenshots"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={isSubmitting}
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    const accepted: File[] = [];
                    for (const f of picked) {
                      if (!f.type.startsWith("image/")) continue;
                      if (f.size > MAX_SCREENSHOT_BYTES) continue;
                      accepted.push(f);
                    }
                    onScreenshotsChange(
                      [...screenshots, ...accepted].slice(0, MAX_SCREENSHOTS),
                    );
                    // Reset so re-picking the same file still fires onChange.
                    e.target.value = "";
                  }}
                />

                {screenshots.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {screenshots.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-xs"
                      >
                        <span className="max-w-[16rem] truncate">{f.name}</span>
                        <span className="text-muted-foreground">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${f.name}`}
                          className="rounded p-0.5 hover:bg-muted"
                          onClick={() =>
                            onScreenshotsChange(
                              screenshots.filter((_, idx) => idx !== i),
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <CardFooter className="mt-2 flex flex-col sm:flex-row items-center gap-3 justify-end p-0">
              <Button
                variant="outline"
                type="button"
                onClick={() => form.reset()}
                disabled={isSubmitting}
                className="w-full sm:w-52"
              >
                Clear
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-52"
              >
                {isSubmitting ? (
                  "Sending…"
                ) : (
                  <>
                    Send request
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

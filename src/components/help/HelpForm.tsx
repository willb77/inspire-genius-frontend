import { useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Upload, Send, X } from "lucide-react";
import type { HelpFormValues, HelpFormProps } from "@/types/help/component-types";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

export default function HelpForm({ form, onSubmit, isSubmitting, isTypesLoading, issueTypes, attachments, onAddFiles, onRemoveAttachment }: HelpFormProps) {
  const { t } = useTranslation("accountUi")
  const MAX_CHARS = 1000;
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { watch } = form;
  const descValue = watch("description");
  const charsLeft = Math.max(0, MAX_CHARS - (descValue?.length || 0));

  const onCancel = () => {
    form.reset();
  };

  const pickFiles = () => fileInputRef.current?.click();
  const addFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    onAddFiles(files);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (values: HelpFormValues) => {
    await onSubmit({ ...values, attachments });
  };

  return (
    <Card className="shadow-none sm:shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="text-base font-medium tracking-tight">
          {t("helpForm.getAssistanceAndResolveIssuesWith", { defaultValue: "Get assistance and resolve issues with ease." })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-left">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="issueTypeId"
                rules={{ required: t("helpForm.issueTypeIsRequired", { defaultValue: "Issue type is required" }) }}
                render={({ field }) => (
                  <FormItem className="flex flex-col md:col-span-1">
                    <FormLabel className="mb-2 block text-xs">{t("helpForm.issueType", { defaultValue: "Issue type" })}</FormLabel>
                    {isTypesLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder={t("helpForm.selectIssueType", { defaultValue: "Select issue type" })} />
                          </SelectTrigger>
                          <SelectContent>
                            {issueTypes.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    )}
                    <div className="min-h-[20px]"><FormMessage /></div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                rules={{ required: t("helpForm.priorityIsRequired", { defaultValue: "Priority is required" }) }}
                render={({ field }) => (
                  <FormItem className="flex flex-col md:col-span-1">
                    <FormLabel className="mb-2 block text-xs">{t("helpForm.priority", { defaultValue: "Priority" })}</FormLabel>
                    {isTypesLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder={t("helpForm.selectPriority", { defaultValue: "Select priority" })} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">{t("helpForm.low", { defaultValue: "Low" })}</SelectItem>
                            <SelectItem value="medium">{t("helpForm.medium", { defaultValue: "Medium" })}</SelectItem>
                            <SelectItem value="high">{t("helpForm.high", { defaultValue: "High" })}</SelectItem>
                            <SelectItem value="critical">{t("helpForm.critical", { defaultValue: "Critical" })}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    )}
                    <div className="min-h-[20px]"><FormMessage /></div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                rules={{ 
                  required: t("helpForm.subjectIsRequired", { defaultValue: "Subject is required" }),
                  minLength: { value: 3, message: t("helpForm.subjectMustBeAtLeast3", { defaultValue: "Subject must be at least 3 characters" }) }
                }}
                render={({ field }) => (
                  <FormItem className="flex flex-col md:col-span-1">
                    <FormLabel className="mb-2 block text-xs">{t("helpForm.subject", { defaultValue: "Subject" })}</FormLabel>
                    {isTypesLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <FormControl>
                        <Input className="w-full" placeholder={t("helpForm.enterSubject", { defaultValue: "Enter subject" })} {...field} />
                      </FormControl>
                    )}
                    <div className="min-h-[20px]"><FormMessage /></div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              rules={{ 
                required: t("helpForm.descriptionIsRequired", { defaultValue: "Description is required" }),
                minLength: {
                  value: 10,
                  message: t("helpForm.descriptionMustBeAtLeast10", { defaultValue: "Description must be at least 10 characters" })
                },
                maxLength: {
                  value: MAX_CHARS,
                  message: t("helpForm.descriptionMustBeMaxChars", { defaultValue: "Description must be {{max}} characters or less", max: MAX_CHARS })
                }
              }}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="mb-2 block text-xs text-black-250">
                      {t("helpForm.description", { defaultValue: "Description" })}
                    </FormLabel>
                    <span
                      className="text-[11px] text-gray-400"
                      aria-live="polite"
                    >
                      {MAX_CHARS - charsLeft}/{MAX_CHARS}
                    </span>
                  </div>
                  {isTypesLoading ? (
                    <Skeleton className="h-24 w-full" />
                  ) : (
                    <FormControl>
                      <textarea
                        placeholder={t("helpForm.enterDetailsAboutYourIssue", { defaultValue: "Enter details about your issue" })}
                        rows={4}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.slice(0, MAX_CHARS))
                        }
                        aria-describedby="message-help"
                        className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <FormLabel className="mb-2 block text-xs">{t("helpForm.attachmentsOptional", { defaultValue: "Attachments (optional)" })}</FormLabel>
                <div
                  className={`rounded-xl border-2 border-dashed ${dragOver ? "border-blue-400 bg-blue-50/40" : "border-gray-300"} p-4`}
                  role="region"
                  aria-label={t("helpForm.attachmentsDropZone", { defaultValue: "Attachments drop zone" })}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Upload className="size-4" /> {t("helpForm.dragAndDropScreenshotsHere", { defaultValue: "Drag and drop screenshots here" })}</div>
                    <div className="text-xs text-muted-foreground">{t("helpForm.or", { defaultValue: "OR" })}</div>
                    <Button disabled={false} type="button" variant="secondary" className="bg-gray-100 hover:bg-gray-100" onClick={pickFiles}>{t("helpForm.browseFiles", { defaultValue: "Browse files" })}</Button>
                    <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => addFiles(e.target.files)} />
                  </div>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                    {attachments.map((f, idx) => (
                      <div key={`${f.name}-${idx}`} className="flex items-center gap-3 rounded-xl border px-3 py-2">
                        <span className="inline-flex items-center justify-center size-6 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-600">{t("helpForm.img", { defaultValue: "IMG" })}</span>
                        <div className="flex-1 text-sm truncate">{f.name}</div>
                        <button className="text-muted-foreground hover:text-foreground" onClick={() => onRemoveAttachment(idx)}>
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <CardFooter className="mt-10 flex flex-col sm:flex-row items-center gap-3 justify-end p-0">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="w-full sm:w-52 bg-gray-20"
                type="button"
              >
                {t("helpForm.cancel", { defaultValue: "Cancel" })}
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-52"
                
              >
                {isSubmitting ? (
                  t("helpForm.sending", { defaultValue: "Sending…" })
                ) : (
                  <>
                    {t("helpForm.send", { defaultValue: "Send" })}
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

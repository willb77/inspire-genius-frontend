import UserLayout from "@/layouts/UserLayout";
import { useMemo, useState } from "react";
import HelpForm from "@/components/help/HelpForm";
import IssueSubmittedDialog from "@/components/help/IssueSubmitted";
import SearchBar from "@/components/shared/SearchBar";
import Pagination from "@/components/shared/Pagination";
import { Badge } from "@/components/ui/badge";
import { useCreateIssue } from "@/hooks/help/useCreateIssue";
import { useIssues } from "@/hooks/help/useIssues";
import type { HelpFormValues } from "@/types/help/component-types";
import { useForm } from "react-hook-form";
import { useIssueTypes } from "@/hooks/help/useIssueTypes";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { V2Panel, V2Card } from "@/components/v2";
import { useSupportAgent } from "@/context/useSupportAgent";

/**
 * HelpV2 — the new-design variant of Help. Flag-gated (new_user_surfaces)
 * additive swap; the classic page is unchanged at /help/classic. Same data,
 * hooks, form and child components — only the page frame + section cards +
 * headings + the Voice-Help callout are re-skinned to the new tokens. RTL-safe.
 * (Existing English strings are preserved verbatim to match the classic page —
 * localizing Help is a separate task, not part of this re-skin.)
 */

const getPriorityVariant = (priority: string) => {
  if (priority === 'critical') return 'destructive' as const;
  if (priority === 'high') return 'default' as const;
  return 'secondary' as const;
};

export default function HelpV2() {
  const { open: openSupportAgent } = useSupportAgent();
  const [showSubmitted, setShowSubmitted] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [attachments, setAttachments] = useState<File[]>([]);

  const listQuery = useIssues({ page, page_size: pageSize });
  const createMutation = useCreateIssue({
    onSuccess: () => {
      setShowSubmitted(true);
      form.reset();
      setAttachments([]);
      setPage(1);
      // Extra safety: ensure immediate UI update
      listQuery.refetch();
    },
  });

  const issueTypesQuery = useIssueTypes();
  const issueTypes = Array.isArray(issueTypesQuery.data?.data) ? issueTypesQuery.data!.data! : [];

  const form = useForm<HelpFormValues>({
    defaultValues: {
      issueTypeId: "",
      subject: "",
      description: "",
      priority: "medium",
      attachments: [],
    },
    mode: "onTouched",
  });

  const handleFormSubmit = async (values: HelpFormValues) => {
    const fd = new FormData();
    fd.append('subject', values.subject);
    fd.append('description', values.description);
    fd.append('priority', values.priority);
    fd.append('issue_type_id', values.issueTypeId);
    const files = attachments;
    for (const f of files) {
      fd.append('attachments', f, f.name);
    }
    await createMutation.mutateAsync(fd);
  };

  const addFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  };
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const items = listQuery.data?.data?.items ?? [];
  const total = listQuery.data?.data?.total ?? 0;
  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
  const isListing = listQuery.isPending;

  return (
    <UserLayout>
      <V2Panel>
        <div className="mb-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="font-serif text-[22px] leading-tight tracking-tight text-ink">
            Help and Support
          </h1>
          <div data-tour="help-search" className="hidden">
            <SearchBar />
          </div>
        </div>

        <div data-tour="help-form">
          <HelpForm
            form={form}
            onSubmit={handleFormSubmit}
            isSubmitting={createMutation.isPending}
            isTypesLoading={issueTypesQuery.isPending}
            issueTypes={issueTypes}
            attachments={attachments}
            onAddFiles={addFiles}
            onRemoveAttachment={removeAttachment}
          />
        </div>

        {/* Voice Help — TODO: Replace href with actual voice help agent URL */}
        <V2Card className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-panel">
          <div className="flex items-center justify-center size-12 rounded-full bg-accent-orange/15 text-accent-orange-dark shrink-0">
            <Phone className="size-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-base tracking-tight text-ink">Talk to Meridian</h2>
            <p className="text-sm text-body-slate mt-0.5">
              Ask a question by voice or text and get an answer right away. Need a person? Submit a request above.
            </p>
          </div>
          <Button
            variant="default"
            className="shrink-0 bg-ink text-white hover:bg-ink/90"
            onClick={openSupportAgent}
          >
            Speak with Support
          </Button>
        </V2Card>

        {/* Issues List */}
        <V2Card className="p-4">
          <div className="text-start mb-3 font-serif text-ink">Recent Issues (TODO: translate)</div>
          {isListing && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-hairline rounded-lg p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Skeleton className="h-4 w-40" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="mt-2 h-10 w-full" />
                  <div className="mt-3">
                    <Skeleton className="h-3 w-28 mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-40 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isListing && items.length === 0 && (
            <div className="text-sm text-body-slate">No issues found.</div>
          )}
          {!isListing && items.length > 0 && (
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.id} className="border border-hairline rounded-lg p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="font-medium text-ink">{it.subject}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={it.status === 'open' ? 'secondary' : 'default'}>{it.status}</Badge>
                      <Badge variant={getPriorityVariant(it.priority)}>{it.priority}</Badge>
                      <span className="text-xs text-body-slate">{new Date(it.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-body-slate line-clamp-3">{it.description}</div>
                  {it.admin_comment?.comment ? (
                    <div className="mt-3 rounded-md border border-hairline bg-panel p-3 text-start">
                      <div className="text-xs font-semibold text-mute">Admin Comment</div>
                      <div className="mt-1 text-sm text-ink">{it.admin_comment.comment}</div>
                      <div className="mt-1 text-xs text-body-slate">
                        {it.admin_comment.created_at ? new Date(it.admin_comment.created_at).toLocaleString() : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
              <div className="pt-2 flex justify-end">
                <Pagination pageCount={pageCount} page={page} onPageChange={setPage} />
              </div>
            </div>
          )}
        </V2Card>

        <IssueSubmittedDialog
          open={showSubmitted}
          onOpenChange={setShowSubmitted}
        />
      </V2Panel>
    </UserLayout>
  );
}

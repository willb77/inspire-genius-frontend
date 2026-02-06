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


const getPriorityVariant = (priority: string) => {
  if (priority === 'critical') return 'destructive' as const;
  if (priority === 'high') return 'default' as const;
  return 'secondary' as const;
};

export default function Help() {
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
      <div className="space-y-4">
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
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

        {/* Issues List */}
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <div className="text-left mb-3 font-semibold">Recent Issues</div>
          {isListing && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-3">
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
            <div className="text-sm text-muted-foreground">No issues found.</div>
          )}
          {!isListing && items.length > 0 && (
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.id} className="border rounded-lg p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="font-medium">{it.subject}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={it.status === 'open' ? 'secondary' : 'default'}>{it.status}</Badge>
                      <Badge variant={getPriorityVariant(it.priority)}>{it.priority}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground line-clamp-3">{it.description}</div>
                  {it.admin_comment?.comment ? (
                    <div className="mt-3 rounded-md border bg-muted/30 p-3 text-left">
                      <div className="text-xs font-semibold text-muted-foreground">Admin Comment</div>
                      <div className="mt-1 text-sm text-foreground">{it.admin_comment.comment}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
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
        </div>
        
        <IssueSubmittedDialog 
          open={showSubmitted} 
          onOpenChange={setShowSubmitted} 
        />
      </div>
    </UserLayout>
  );
}

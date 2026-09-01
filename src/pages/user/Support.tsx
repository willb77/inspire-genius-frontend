import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Phone } from "lucide-react";

import { toast } from "sonner";
import { uploadTicketScreenshot } from "@/services/support/support.service";
import UserLayout from "@/layouts/UserLayout";
import SupportRequestForm from "@/components/support/SupportRequestForm";
import SupportRequestList from "@/components/support/SupportRequestList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/useAuth";
import {
  useCreateSupportTicket,
  useSupportTickets,
} from "@/hooks/support/useSupportTickets";
import {
  supportRequestSchema,
  type SupportRequestValues,
} from "@/types/support/component-types";

/**
 * Help & Support — the support-request surface at /help.
 *
 * Posts to support-service (`/v1/support/tickets`), which emails
 * contact@inspiresgenius.com with the requester's contact block on every
 * submission. The previous Help page (and its flag-gated V2 re-skin), which
 * posted to the legacy monolith `/v1/issues`, is preserved at /help/classic.
 */
export default function Support() {
  const { user } = useAuth();
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);

  const listQuery = useSupportTickets(
    user?.id ? { user_id: user.id } : undefined,
  );
  const createMutation = useCreateSupportTicket();

  const form = useForm<SupportRequestValues>({
    resolver: zodResolver(supportRequestSchema) as Resolver<SupportRequestValues>,
    defaultValues: {
      contactName: user?.fullName ?? user?.name ?? "",
      contactEmail: user?.email ?? "",
      contactPhone: "",
      category: "",
      priority: "normal",
      subject: "",
      description: "",
    },
    mode: "onTouched",
  });

  // The auth context hydrates asynchronously, so the first render can have no
  // user yet. Backfill the contact fields once it arrives, without clobbering
  // anything the person has already typed.
  useEffect(() => {
    if (!user) return;
    if (!form.getFieldState("contactName").isDirty && !form.getValues("contactName")) {
      form.setValue("contactName", user.fullName ?? user.name ?? "");
    }
    if (!form.getFieldState("contactEmail").isDirty && !form.getValues("contactEmail")) {
      form.setValue("contactEmail", user.email ?? "");
    }
  }, [user, form]);

  const handleSubmit = async (values: SupportRequestValues) => {
    const ticket = await createMutation.mutateAsync({
      // Backward compatibility only. The current support-service takes
      // ownership from the verified JWT and ignores this field; older
      // deployments (staging-b, as of 2026-07-27) still declare `user_id`
      // required and reject the submission with a 422 without it.
      user_id: user?.id,
      subject: values.subject,
      description: values.description,
      priority: values.priority,
      category: values.category,
      contact_name: values.contactName,
      contact_email: values.contactEmail,
      contact_phone: values.contactPhone || undefined,
    });

    setLastSubmittedId(ticket.id);

    // Screenshots upload AFTER the ticket exists, because each one is keyed
    // to a ticket id. A failed screenshot must not read as a failed request:
    // the request is already saved and the support team already has it, so
    // report the partial outcome instead of throwing away a successful post.
    if (screenshots.length > 0) {
      const failed: string[] = [];
      for (const file of screenshots) {
        try {
          await uploadTicketScreenshot(ticket.id, file);
        } catch {
          failed.push(file.name);
        }
      }
      if (failed.length === 0) {
        toast.success(
          `${screenshots.length} screenshot${screenshots.length === 1 ? "" : "s"} attached.`,
        );
      } else {
        toast.error(
          `Your request was sent, but ${failed.length} screenshot${failed.length === 1 ? "" : "s"} could not be attached (${failed.join(", ")}). You can reply to the confirmation email with the image.`,
        );
      }
      await listQuery.refetch();
    }
    setScreenshots([]);

    // Keep the contact block — only clear what is specific to this request.
    form.reset({
      ...form.getValues(),
      category: "",
      priority: "normal",
      subject: "",
      description: "",
    });
  };

  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Help and Support
          </h1>
          {listQuery.data?.length ? (
            <Badge variant="secondary">
              {listQuery.data.length} request
              {listQuery.data.length === 1 ? "" : "s"}
            </Badge>
          ) : null}
        </div>

        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 flex items-start gap-3">
          <div className="flex items-center justify-center size-9 rounded-full bg-blue-100 text-blue-600 shrink-0">
            <Mail className="size-5" />
          </div>
          <p className="text-sm text-muted-foreground">
            Every request you post here is emailed straight to the Inspire
            Genius support team along with your contact details, so someone can
            get back to you directly.
          </p>
        </div>

        <SupportRequestForm
          form={form}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
        />

        {/* Carried over from the previous Help page so the voice route isn't
            lost in the move to support-service. */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center justify-center size-12 rounded-full bg-blue-100 text-blue-600 shrink-0">
            <Phone className="size-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold tracking-tight">Voice Help</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Prefer to talk? Connect with our AI voice support agent for
              real-time assistance.
            </p>
          </div>
          <Button
            variant="default"
            className="shrink-0"
            onClick={() => window.dispatchEvent(new CustomEvent("voicedesk:open"))}
          >
            Speak with Support
          </Button>
        </div>

        <SupportRequestList
          tickets={listQuery.data ?? []}
          isLoading={listQuery.isPending}
          highlightId={lastSubmittedId}
        />
      </div>
    </UserLayout>
  );
}

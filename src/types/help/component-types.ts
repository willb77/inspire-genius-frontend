export type HelpFormValues = {
  issueTypeId: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  attachments: File[];
};

export interface HelpFormProps {
  form: import('react-hook-form').UseFormReturn<HelpFormValues>;
  onSubmit: (values: HelpFormValues) => Promise<void>;
  isSubmitting?: boolean;
  isTypesLoading?: boolean;
  issueTypes: Array<{ id: string; name: string }>;
  attachments: File[];
  onAddFiles: (files: FileList | null) => void;
  onRemoveAttachment: (index: number) => void;
}

export interface IssueSubmittedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


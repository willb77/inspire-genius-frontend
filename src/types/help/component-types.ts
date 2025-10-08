export type HelpFormValues = {
  firstName: string;
  email: string;
  message: string;
  agree: boolean;
};

export interface HelpFormProps {
  onSubmit: (values: HelpFormValues) => Promise<void>;
}

export interface IssueSubmittedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


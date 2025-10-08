// My Documents page component types

import type { UploadedFile } from "./data-types";

// UploadDocumentsModal component props
export interface UploadDocumentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: (files: UploadedFile[], category: string) => void;
}


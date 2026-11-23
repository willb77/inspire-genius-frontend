import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface MaterialListItem {
  id: string;
  /** Already-translated group label ("Bio", "Additional info"). */
  label: string;
  fileName: string;
}

/**
 * "View Bio and Data": the member's own bio and additional-information
 * documents, one row each. Picking a row hands it to the host, which opens it
 * in the shared document viewer. Read-only — uploading stays on the tile.
 */
export function ProfileMaterialDialog({
  open,
  items,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  items: MaterialListItem[];
  onOpenChange: (open: boolean) => void;
  onPick: (item: MaterialListItem) => void;
}): JSX.Element {
  const { t } = useTranslation("accountUi");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="profile-material-dialog" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {t("aboutYouPanel.bioAndDataTitle", { defaultValue: "Your bio and personal data" })}
          </DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item)}
                data-testid={`profile-material-${item.id}`}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-[13px] text-ig-ink transition-colors hover:bg-ig-page"
              >
                <FileText className="size-4 shrink-0 text-ig-accent" aria-hidden="true" />
                <span className="font-medium">{item.label}</span>
                <span className="min-w-0 truncate text-ig-faint">{item.fileName}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

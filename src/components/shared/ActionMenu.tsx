import { useTranslation } from "react-i18next";
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  MessageCircleX,
  UserCheck,
  Mail,
  Bot,
  FileUp,
  Activity,
  ShieldCheck,
  LayoutGrid,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { withPrism } from "@/lib/withPrism"

export type MenuOption = { label: string; value: string };

export type ActionMenuProps<Row = unknown> = {
  row?: Row;
  triggerClassName?: string;
  align?: "start" | "end" | "center";
  // Toggles for actions
  showResend?: boolean;
  showView?: boolean;
  showActivity?: boolean;
  showEdit?: boolean;
  showDeactivate?: boolean;
  showActivate?: boolean;
  showDelete?: boolean;
  // Sub options
  viewOptions?: ReadonlyArray<MenuOption>;
  editOptions?: ReadonlyArray<MenuOption>;
  // Callbacks (row and optional option value)
  onView?: (row?: Row, option?: string) => void;
  onActivity?: (row?: Row) => void;
  onEdit?: (row?: Row, option?: string) => void;
  onResend?: (row?: Row) => void;
  onDeactivate?: (row?: Row) => void;
  onActivate?: (row?: Row) => void;
  onDelete?: (row?: Row) => void;
  showCoaches?: boolean;
  onCoaches?: (row?: Row) => void;
  showImportPrism?: boolean;
  onImportPrism?: (row?: Row) => void;
  showPrismPdf?: boolean;
  onPrismPdf?: (row?: Row) => void;
  showPrismAccess?: boolean;
  onPrismAccess?: (row?: Row) => void;
  showVerticalEntitlements?: boolean;
  onVerticalEntitlements?: (row?: Row) => void;
};

export default function ActionMenu<Row = unknown>({
  row,
  triggerClassName,
  align = "end",
  showResend = true,
  showView = true,
  showActivity = false,
  showEdit = true,
  showDeactivate = true,
  showActivate = false,
  showDelete = false,
  viewOptions,
  editOptions,
  onView,
  onActivity,
  onEdit,
  onResend,
  onDeactivate,
  onActivate,
  onDelete,
  showCoaches = false,
  onCoaches,
  showImportPrism = false,
  onImportPrism,
  showPrismPdf = false,
  onPrismPdf,
  showPrismAccess = false,
  onPrismAccess,
  showVerticalEntitlements = false,
  onVerticalEntitlements,
}: ActionMenuProps<Row>) {
  const { t } = useTranslation("shellUi");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            "h-8 w-8 inline-flex items-center justify-center rounded hover:bg-gray-100 " +
            (triggerClassName ?? "")
          }
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">{t("actionMenu.openMenu", { defaultValue: "Open menu" })}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align}>
        {showView &&
          (viewOptions && viewOptions.length ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Eye className="w-4 h-4 mr-2" /> {t("actionMenu.view", { defaultValue: "View" })}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {viewOptions.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => onView?.(row, opt.value)}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem onClick={() => onView?.(row)}>
              <Eye className="w-4 h-4 mr-2" /> {t("actionMenu.view", { defaultValue: "View" })}
            </DropdownMenuItem>
          ))}

        {showView && (showEdit || showDeactivate || showResend) && (
          <DropdownMenuSeparator />
        )}

        {showEdit &&
          (editOptions && editOptions.length ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Edit className="w-4 h-4 mr-2" /> {t("actionMenu.edit", { defaultValue: "Edit" })}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {editOptions.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => onEdit?.(row, opt.value)}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem onClick={() => onEdit?.(row)}>
              <Edit className="w-4 h-4 mr-2" /> {t("actionMenu.edit", { defaultValue: "Edit" })}
            </DropdownMenuItem>
          ))}

        {showResend && (
          <DropdownMenuItem onClick={() => onResend?.(row)}>
            <Mail className="w-4 h-4 mr-2" /> {t("actionMenu.resend", { defaultValue: "Resend" })}
          </DropdownMenuItem>
        )}

        {showActivity && (
          <DropdownMenuItem onClick={() => onActivity?.(row)}>
            <Activity className="w-4 h-4 mr-2 text-sky-600" /> {t("actionMenu.activity", { defaultValue: "Activity" })}
          </DropdownMenuItem>
        )}

        {showCoaches && (
          <DropdownMenuItem onClick={() => onCoaches?.(row)}>
            <Bot className="w-4 h-4 mr-2" /> {t("actionMenu.coaches", { defaultValue: "Coaches" })}
          </DropdownMenuItem>
        )}

        {showPrismPdf && (
          <DropdownMenuItem onClick={() => onPrismPdf?.(row)}>
            <FileUp className="w-4 h-4 mr-2 text-teal-600" /> {withPrism(t("actionMenu.prismPdf", { defaultValue: "Upload / Delete PRISM PDF" }))}
          </DropdownMenuItem>
        )}
        {showImportPrism && (
          <DropdownMenuItem onClick={() => onImportPrism?.(row)}>
            <FileUp className="w-4 h-4 mr-2 text-indigo-500" /> {withPrism(t("actionMenu.prismCsv", { defaultValue: "Upload PRISM CSV" }))}
          </DropdownMenuItem>
        )}
        {showPrismAccess && (
          <DropdownMenuItem onClick={() => onPrismAccess?.(row)}>
            <ShieldCheck className="w-4 h-4 mr-2 text-emerald-600" /> {withPrism(t("actionMenu.prismAccess", { defaultValue: "PRISM survey access" }))}
          </DropdownMenuItem>
        )}
        {showVerticalEntitlements && (
          <DropdownMenuItem onClick={() => onVerticalEntitlements?.(row)}>
            <LayoutGrid className="w-4 h-4 mr-2 text-sky-600" /> {t("actionMenu.verticalEntitlements", { defaultValue: "Vertical entitlements" })}
          </DropdownMenuItem>
        )}

        {(showEdit || showResend) && showDeactivate && (
          <DropdownMenuSeparator />
        )}

        {showDeactivate && (
          <DropdownMenuItem onClick={() => onDeactivate?.(row)}>
            <MessageCircleX className="w-4 h-4 mr-2 text-gray-500" /> {t("actionMenu.deactivate", { defaultValue: "Deactivate" })}
          </DropdownMenuItem>
        )}

        {showActivate && (
          <DropdownMenuItem onClick={() => onActivate?.(row)}>
            <UserCheck className="w-4 h-4 mr-2 text-emerald-500" /> {t("actionMenu.activate", { defaultValue: "Activate" })}
          </DropdownMenuItem>
        )}

        {showDelete &&
          (showView || showEdit || showDeactivate || showResend) && (
            <DropdownMenuSeparator />
          )}

        {showDelete && (
          <DropdownMenuItem onClick={() => onDelete?.(row)}>
            <Trash2 className="w-4 h-4 mr-2" /> {t("actionMenu.delete", { defaultValue: "Delete" })}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

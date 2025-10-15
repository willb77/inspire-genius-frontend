import { MoreVertical, Eye, Edit, Trash2, MessageCircleX } from "lucide-react";
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

export type MenuOption = { label: string; value: string };

export type ActionMenuProps<Row = unknown> = {
  row?: Row;
  triggerClassName?: string;
  align?: "start" | "end" | "center";
  // Toggles for actions
  showView?: boolean;
  showEdit?: boolean;
  showDeactivate?: boolean;
  showDelete?: boolean;
  // Sub options
  viewOptions?: ReadonlyArray<MenuOption>;
  editOptions?: ReadonlyArray<MenuOption>;
  // Callbacks (row and optional option value)
  onView?: (row?: Row, option?: string) => void;
  onEdit?: (row?: Row, option?: string) => void;
  onDeactivate?: (row?: Row) => void;
  onDelete?: (row?: Row) => void;
};

export default function ActionMenu<Row = unknown>({
  row,
  triggerClassName,
  align = "end",
  showView = true,
  showEdit = true,
  showDeactivate = true,
  showDelete = false,
  viewOptions,
  editOptions,
  onView,
  onEdit,
  onDeactivate,
  onDelete,
}: ActionMenuProps<Row>) {
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
          <span className="sr-only">Open menu</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {showView && (
          viewOptions && viewOptions.length ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Eye className="w-4 h-4 mr-2" /> View
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {viewOptions.map((opt) => (
                    <DropdownMenuItem key={opt.value} onClick={() => onView?.(row, opt.value)}>
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem onClick={() => onView?.(row)}>
              <Eye className="w-4 h-4 mr-2" /> View
            </DropdownMenuItem>
          )
        )}

        {showView && (showEdit || showDeactivate) && <DropdownMenuSeparator />}

        {showEdit && (
          editOptions && editOptions.length ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {editOptions.map((opt) => (
                    <DropdownMenuItem key={opt.value} onClick={() => onEdit?.(row, opt.value)}>
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem onClick={() => onEdit?.(row)}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
          )
        )}

        {showEdit && showDeactivate && <DropdownMenuSeparator />}

        {showDeactivate && (
          <DropdownMenuItem onClick={() => onDeactivate?.(row)}>
            <MessageCircleX className="w-4 h-4 mr-2 text-gray-500" /> Deactivate
          </DropdownMenuItem>
        )}

        {showDelete && (showView || showEdit || showDeactivate) && <DropdownMenuSeparator />}

        {showDelete && (
          <DropdownMenuItem onClick={() => onDelete?.(row)}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

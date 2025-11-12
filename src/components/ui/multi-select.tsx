import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MultiSelectOption = { label: string; value: string };

export interface MultiSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  className?: string;
  maxVisible?: number; // how many chips to show before collapsing to +N
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  className,
  maxVisible = 3,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) => {
    const has = value.includes(v);
    const next = has ? value.filter((x) => x !== v) : [...value, v];
    onChange(next);
  };

  const selected = options.filter((o) => value.includes(o.value));
  const visible = selected.slice(0, maxVisible);
  const remaining = selected.length - visible.length;

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "border border-gray-10 bg-gray-100 text-left w-full h-11 rounded-xl px-3 text-sm flex items-center justify-between",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none",
            className,
          )}
        >
          <span className="flex items-center gap-2 overflow-hidden">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {visible.map((o) => (
                  <span
                    key={o.value}
                    className="bg-white rounded-md px-2 py-0.5 text-xs border border-gray-200"
                  >
                    {o.label}
                  </span>
                ))}
                {remaining > 0 && (
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">+{remaining}</span>
                )}
              </>
            )}
          </span>
          <ChevronDownIcon className="size-4 opacity-60" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        sideOffset={6}
        className="bg-white rounded-md shadow-md border p-1 min-w-[220px] z-50"
      >
        {options.map((o) => {
          const checked = value.includes(o.value);
          return (
            <DropdownMenu.CheckboxItem
              key={o.value}
              checked={checked}
              onCheckedChange={() => toggle(o.value)}
              onSelect={(e) => e.preventDefault()}
              className={cn(
                "text-sm px-2 py-1.5 pr-8 rounded-md outline-none cursor-pointer",
                "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
              )}
            >
              <DropdownMenu.ItemIndicator className="absolute right-2">
                <CheckIcon className="size-4" />
              </DropdownMenu.ItemIndicator>
              {o.label}
            </DropdownMenu.CheckboxItem>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

export default MultiSelect;

"use client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format as formatDate } from "date-fns";

export type DatePickerButtonProps = {
  date?: Date;
  onSelect: (date?: Date) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  buttonClassName?: string;
  align?: "start" | "center" | "end";
  formatStr?: string;
};

export default function DatePickerButton({
  date,
  onSelect,
  placeholder = "Pick a date",
  disabled,
  buttonClassName,
  align = "start",
  formatStr = "dd-MM-yyyy",
}: DatePickerButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={"justify-start text-left font-normal h-9 flex items-center " + (buttonClassName ?? "") }>
          <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
          {date ? formatDate(date, formatStr) : <span className="text-muted-foreground">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="p-0">
        <Calendar mode="single" selected={date} onSelect={onSelect} disabled={disabled} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

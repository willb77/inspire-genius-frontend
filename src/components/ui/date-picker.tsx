import { forwardRef, useMemo } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isValid, parse } from "date-fns";

export type DatePickerProps = {
  value?: string; // formatted like "d LLL yyyy"
  onChange: (v: string) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  displayFormat?: string; // optional, defaults to onboarding's "d LLL yyyy"
};

// Button-like input to match existing UI
const Trigger = forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void; placeholder?: string; className?: string }>(
  ({ value, onClick, placeholder, className }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      onClick={onClick}
      className={"!h-11 w-full justify-start rounded-md border border-gray-10 text-left font-normal relative pr-10 " + (className ?? "")}
    >
      {value ? (
        <span>{value}</span>
      ) : (
        <span className="text-muted-foreground">{placeholder ?? "Select date"}</span>
      )}
      <CalendarIcon
        className="h-4 w-4 opacity-70 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        aria-hidden="true"
      />
    </Button>
  )
);
Trigger.displayName = "DatePickerTrigger";

export function DatePicker({ value, onChange, placeholder, minDate = new Date(1900, 0, 1), maxDate = new Date(), className, displayFormat = "d LLL yyyy" }: DatePickerProps) {
  const selected = useMemo(() => {
    if (!value) return undefined;
    // Parse using provided display format first, fallback to native
    let d = parse(value, displayFormat, new Date());
    if (!isValid(d)) d = new Date(value);
    return isValid(d) ? d : undefined;
  }, [value, displayFormat]);
  return (
    <ReactDatePicker
      wrapperClassName="w-full"
      selected={selected}
      onChange={(d: Date | null) => {
        const v = d ? format(d, displayFormat) : "";
        onChange(v);
      }}
      dateFormat={displayFormat}
      minDate={minDate}
      maxDate={maxDate}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      placeholderText={placeholder ?? "Select date"}
      customInput={<Trigger value={value} placeholder={placeholder} className={className} />}
      // Accessibility improvements
      isClearable
      popperPlacement="bottom-start"
    />
  );
}

import { useRef } from "react";
import type { KeyboardEvent, ChangeEvent, ClipboardEvent } from "react";

export type OtpInputFieldProps = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  inputClassName?: string;
};

export function OtpInputField({ length = 6, value, onChange, inputClassName }: OtpInputFieldProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  if (inputRefs.current.length !== length) {
    inputRefs.current = Array(length).fill(null);
  }

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);

    // Create a new value string with the updated digit
    const newValue = value.split("");
    newValue[index] = digit;
    const updatedValue = newValue.join("");

    onChange(updatedValue);

    // Auto-focus next input if available
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const digits = text.replace(/\D/g, "");
    if (!digits) return;
    e.preventDefault();

    // Fill starting from current index
    const toFill = digits.split("");
    const current = value.split("");
    let write = index;
    for (let i = 0; i < toFill.length && write < length; i += 1, write += 1) {
      current[write] = toFill[i];
    }
    onChange(current.join(""));

    const filledCount = Math.min(toFill.length, length - index);
    const focusIdx = Math.min(index + filledCount - 1, length - 1);
    if (focusIdx >= 0) {
      inputRefs.current[focusIdx]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) {
        // If current input is empty and backspace is pressed, focus previous input
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle left arrow key
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle right arrow key
    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="flex md:gap-4 gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          className={
            inputClassName ||
            "h-14 w-14 rounded-xl border border-input bg-transparent text-lg text-center shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
          }
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}

export default OtpInputField;

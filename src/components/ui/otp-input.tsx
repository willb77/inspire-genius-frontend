import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type OtpInputProps = {
  length?: number;
  value?: string;
  onChange?: (code: string) => void;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  disabled?: boolean;
};

export function OtpInput({
  length = 6,
  value,
  onChange,
  className,
  inputClassName,
  autoFocus = true,
  disabled = false,
}: OtpInputProps) {
  const [internal, setInternal] = useState<string>(Array(length).fill("").join(""));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const code = useMemo(() => (value !== undefined ? value : internal), [value, internal]);

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
      inputsRef.current[0].select();
    }
  }, [autoFocus]);

  useEffect(() => {
    // Ensure internal state respects length changes
    setInternal((prev) => (prev + Array(length).fill("").join("")).slice(0, length));
  }, [length]);

  const setCharAt = (index: number, char: string) => {
    const chars = code.split("");
    chars[index] = char;
    const next = chars.join("");
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const v = e.target.value.replace(/\s+/g, "");
    if (v.length === 0) {
      setCharAt(idx, "");
      return;
    }
    if (/^\d+$/.test(v) === false) return; // allow only digits

    if (v.length === 1) {
      setCharAt(idx, v);
      const next = inputsRef.current[idx + 1];
      next?.focus();
      next?.select();
    } else {
      // Handle paste of multiple digits
      const chars = code.split("");
      let i = idx;
      for (const ch of v.slice(0, length - idx)) {
        if (!/\d/.test(ch)) continue;
        chars[i++] = ch;
      }
      const nextVal = chars.join("");
      if (value === undefined) setInternal(nextVal);
      onChange?.(nextVal);
      const moveTo = Math.min(idx + v.length, length - 1);
      inputsRef.current[moveTo]?.focus();
      inputsRef.current[moveTo]?.select();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    const target = e.currentTarget;
    if (e.key === "Backspace") {
      if (target.value) {
        setCharAt(idx, "");
      } else if (idx > 0) {
        inputsRef.current[idx - 1]?.focus();
        setCharAt(idx - 1, "");
      }
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowRight" && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  return (
    <div className={cn("flex gap-6 w-full", className)}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          disabled={disabled}
          maxLength={1}
          value={code[i] ?? ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className={cn(
            "h-12 w-12 rounded-lg border bg-transparent text-center text-lg outline-none",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
            "shadow-xs",
            "dark:bg-input/30",
            inputClassName
          )}
        />
      ))}
    </div>
  );
}

export default OtpInput;

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

export function OTPInput({
  value = "",
  onChange,
  length = 6,
  className,
  disabled,
  ...props
}: OTPInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [localValue, setLocalValue] = React.useState<string[]>(
    value.split("").concat(Array(length).fill("")).slice(0, length)
  );

  React.useEffect(() => {
    const newValue = value.split("").concat(Array(length).fill("")).slice(0, length);
    setLocalValue(newValue);
  }, [value, length]);

  const handleChange = (index: number, newValue: string) => {
    if (disabled) return;

    const digit = newValue.replace(/[^0-9]/g, "").slice(-1);
    const newOTP = [...localValue];
    newOTP[index] = digit;
    setLocalValue(newOTP);
    onChange(newOTP.join(""));

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Backspace" && !localValue[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, length);
    const newOTP = pastedData.split("").concat(Array(length).fill("")).slice(0, length);
    setLocalValue(newOTP);
    onChange(newOTP.join(""));

    // Focus the next empty input or the last one
    const nextEmptyIndex = newOTP.findIndex(v => v === "");
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(ref) => (inputRefs.current[index] = ref)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={localValue[index]}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            "h-12 w-12 text-center text-lg font-semibold",
            "rounded-md border border-input bg-background",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all"
          )}
          {...props}
        />
      ))}
    </div>
  );
}
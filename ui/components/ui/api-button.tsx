"use client";

import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface ApiButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  children?: React.ReactNode;
}

export function ApiButton({
  children,
  loading = false,
  loadingText,
  disabled,
  className,
  ...props
}: ApiButtonProps) {
  return (
    <Button
      disabled={loading || disabled}
      className={cn("relative", className)}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-md">
          <Spinner size="sm" />
          {loadingText && <span className="ml-2">{loadingText}</span>}
        </div>
      )}
      <span className={cn(loading && "invisible")}>{children}</span>
    </Button>
  );
}
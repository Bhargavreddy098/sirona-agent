import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-bg)] px-3 py-1 text-xs shadow-xs transition-all placeholder:text-neutral-500 focus-visible:outline-none focus-visible:border-[var(--border-active)] focus-visible:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40 text-neutral-900 dark:text-neutral-100",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

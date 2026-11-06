import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-active)] disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none";

    const variantStyles = {
      default: "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white shadow-xs",
      destructive: "bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20",
      outline: "border border-[var(--border-subtle)] bg-[var(--surface-bg)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-active)] text-neutral-200 shadow-xs",
      secondary: "bg-[var(--surface-bg)] text-neutral-200 border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] shadow-xs",
      ghost: "hover:bg-[var(--surface-hover)] text-neutral-400 hover:text-neutral-100",
      link: "text-neutral-300 underline-offset-4 hover:underline",
    };

    const sizeStyles = {
      default: "h-8.5 px-3.5 py-1.5 text-xs rounded-[var(--radius-md)]",
      sm: "h-7 px-2.5 text-xs rounded-[var(--radius-sm)]",
      lg: "h-9.5 px-5 text-sm rounded-[var(--radius-lg)]",
      icon: "h-8 w-8 rounded-[var(--radius-md)]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

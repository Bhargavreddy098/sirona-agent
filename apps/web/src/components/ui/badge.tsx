import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  ...props
}) => {
  const variantStyles = {
    default: "border-transparent bg-neutral-900 text-neutral-50 hover:bg-neutral-900/80 dark:bg-neutral-50 dark:text-neutral-900",
    secondary: "border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80 dark:bg-neutral-800 dark:text-neutral-100",
    destructive: "border-transparent bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-900/50",
    outline: "text-neutral-950 dark:text-neutral-50 border-neutral-200 dark:border-neutral-800",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 border",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
};

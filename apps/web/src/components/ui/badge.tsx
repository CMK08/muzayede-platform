import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "live";
}

const badgeVariants = {
  default: "bg-primary-500 text-white border-transparent",
  secondary:
    "bg-[var(--muted)] text-[var(--muted-foreground)] border-transparent",
  destructive: "bg-red-500 text-white border-transparent",
  outline: "border-[var(--border)] text-[var(--foreground)]",
  success: "bg-emerald-500 text-white border-transparent",
  warning: "bg-amber-500 text-white border-transparent",
  live: "bg-red-500 text-white border-transparent animate-pulse",
};

function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

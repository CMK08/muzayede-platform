import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "destructive";
}

const progressVariants = {
  default: "bg-primary-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  destructive: "bg-red-500",
};

function Progress({
  value = 0,
  max = 100,
  variant = "default",
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]",
        className
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          progressVariants[variant]
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export { Progress };

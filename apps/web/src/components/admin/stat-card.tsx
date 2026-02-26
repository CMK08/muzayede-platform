"use client";

import React from "react";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  description?: string;
  iconColor?: string;
  iconBgColor?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
  iconColor = "text-primary-500",
  iconBgColor = "bg-primary-500/10",
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              iconBgColor
            )}
          >
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          {change && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                changeType === "positive" &&
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                changeType === "negative" &&
                  "bg-red-500/10 text-red-600 dark:text-red-400",
                changeType === "neutral" &&
                  "bg-[var(--muted)] text-[var(--muted-foreground)]"
              )}
            >
              {changeType === "positive" && (
                <TrendingUp className="h-3 w-3" />
              )}
              {changeType === "negative" && (
                <TrendingDown className="h-3 w-3" />
              )}
              {change}
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{title}</p>
        </div>
        {description && (
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

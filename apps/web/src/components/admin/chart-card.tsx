"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  periods?: { label: string; value: string }[];
  activePeriod?: string;
  onPeriodChange?: (period: string) => void;
  actions?: React.ReactNode;
  className?: string;
  loading?: boolean;
}

export function ChartCard({
  title,
  children,
  periods,
  activePeriod,
  onPeriodChange,
  actions,
  className,
  loading = false,
}: ChartCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {periods && (
            <div className="flex gap-1">
              {periods.map((period) => (
                <Button
                  key={period.value}
                  variant={activePeriod === period.value ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onPeriodChange?.(period.value)}
                >
                  {period.label}
                </Button>
              ))}
            </div>
          )}
          {actions}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

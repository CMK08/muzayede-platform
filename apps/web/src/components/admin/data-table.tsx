"use client";

import React, { useState } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  selectedRows?: Set<number>;
  onRowSelect?: (index: number) => void;
  onSelectAll?: () => void;
  bulkActions?: React.ReactNode;
  filters?: React.ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchPlaceholder = "Ara...",
  searchValue = "",
  onSearchChange,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50],
  onPageSizeChange,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  loading = false,
  emptyMessage = "Kayit bulunamadi",
  selectedRows,
  onRowSelect,
  onSelectAll,
  bulkActions,
  filters,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const allSelected =
    selectedRows && data.length > 0 && selectedRows.size === data.length;

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {onSearchChange && (
          <div className="relative w-full sm:max-w-sm">
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-9"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {filters}
          {bulkActions && selectedRows && selectedRows.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-primary-500/10 px-3 py-1.5 text-xs">
              <span className="font-medium text-primary-500">
                {selectedRows.size} secili
              </span>
              {bulkActions}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {loading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                {columns.map((_, j) => (
                  <div
                    key={j}
                    className="h-4 flex-1 animate-pulse rounded bg-[var(--muted)]"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {selectedRows && (
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => onSelectAll?.()}
                      className="h-4 w-4 rounded border-[var(--border)] accent-primary-500"
                    />
                  </TableHead>
                )}
                {columns.map((column) => (
                  <TableHead key={column.key} className={column.className}>
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="flex items-center gap-1 hover:text-[var(--foreground)]"
                      >
                        {column.header}
                        {sortKey === column.key ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      columns.length + (selectedRows ? 1 : 0)
                    }
                    className="h-32 text-center text-[var(--muted-foreground)]"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((item, index) => (
                  <TableRow
                    key={index}
                    className={cn(
                      selectedRows?.has(index) && "bg-primary-500/5"
                    )}
                  >
                    {selectedRows && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(index)}
                          onChange={() => onRowSelect?.(index)}
                          className="h-4 w-4 rounded border-[var(--border)] accent-primary-500"
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={column.className}
                      >
                        {column.render
                          ? column.render(item, index)
                          : (item[column.key] as React.ReactNode)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <span>Toplam {totalItems} kayit</span>
          {onPageSizeChange && (
            <>
              <span>|</span>
              <div className="flex items-center gap-1">
                <span>Sayfa basina:</span>
                <Select
                  options={pageSizeOptions.map((size) => ({
                    value: String(size),
                    label: String(size),
                  }))}
                  value={String(pageSize)}
                  onChange={(e) =>
                    onPageSizeChange(Number(e.target.value))
                  }
                  className="h-8 w-16"
                />
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage <= 1}
            onClick={() => onPageChange?.(1)}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage <= 1}
            onClick={() => onPageChange?.(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 px-2">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => onPageChange?.(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange?.(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange?.(totalPages)}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

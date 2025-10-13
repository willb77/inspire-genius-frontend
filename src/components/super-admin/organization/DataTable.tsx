"use client";
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Column<TData> = {
  key: string;
  header: React.ReactNode;
  render?: (row: TData, rowIndex: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
};

type SortDirection = "asc" | "desc" | undefined;

interface DataTableProps<TData extends Record<string, unknown>> {
  columns: Column<TData>[];
  data: TData[];
  emptyMessage?: string;
  // Controlled sorting (optional)
  sortKey?: string;
  sortDirection?: SortDirection;
  onSortChange?: (key: string) => void;
  // Row click (optional)
  onRowClick?: (row: TData, rowIndex: number) => void;
}

export function DataTable<TData extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = "No results.",
  sortKey,
  sortDirection,
  onSortChange,
  onRowClick,
}: DataTableProps<TData>) {
  const handleSort = (col: Column<TData>) => {
    if (!col.sortable || !onSortChange) return;
    onSortChange(col.key);
  };

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={col.headerClassName}
                onClick={() => handleSort(col)}
              >
                <div className={col.sortable ? "cursor-pointer select-none" : undefined}>
                  {col.header}
                  {col.sortable && sortKey === col.key && sortDirection && (
                    <span className="ml-1 text-xs align-middle">{sortDirection === "asc" ? "▲" : "▼"}</span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length ? (
            data.map((row, ri) => (
              <TableRow key={ri} className="text-left" onClick={() => onRowClick?.(row, ri)}>
                {columns.map((col) => {
                  const raw = row[col.key as keyof TData];
                  const fallback = (raw as React.ReactNode) ?? null;
                  return (
                    <TableCell key={col.key} className={col.className}>
                      {col.render ? col.render(row, ri) : fallback}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

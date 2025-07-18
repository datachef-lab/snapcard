"use client";
import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
// import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";

type ColumnMeta = { className?: string };

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  page: number;
  pageSize: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  page,
  pageSize,
  pageCount,
  onPageChange,
  onPageSizeChange,
  search,
  onSearchChange,
  loading,
  error,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize },
    },
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange: updater => {
      if (typeof updater === "function") {
        const next = updater({ pageIndex: page - 1, pageSize });
        onPageChange(next.pageIndex + 1);
      } else {
        onPageChange(updater.pageIndex + 1);
      }
    },
  });

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2">
        {/* <Input
          placeholder="Search by name or code number..."
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          className="max-w-xs"
        /> */}
      </div>
      <div className="rounded-md border min-h-[300px] relative">
        {loading && (!data || data.length === 0) ? (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col, i) => (
                  <TableHead className="bg-slate-50" key={i} colSpan={i === 0 ? 2 : 1}>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, rowIdx) => (
                <TableRow key={rowIdx}>
                  {columns.map((_, colIdx) => (
                    <TableCell key={colIdx}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <div className="relative">
            {/* Table header (sticky, not scrollable) */}
            <Table className="w-full" style={{ tableLayout: 'fixed' }}>
              <TableHeader className="sticky top-0 z-10 text-center bg-slate-50 backdrop-blur border-b">
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHead key={header.id} className={(header.column.columnDef.meta as ColumnMeta)?.className}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
            </Table>
            {/* Scrollable table body */}
            <div className="max-h-[500px] overflow-auto">
              <Table className="w-full" style={{ tableLayout: 'fixed' }}>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map(row => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id} className={(cell.column.columnDef.meta as ColumnMeta)?.className}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {loading && data && data.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-20 transition-opacity duration-200">
                <div className="flex flex-col items-center">
                  <Spinner className="h-10 w-10" />
                  <span className="mt-2 text-sm text-muted-foreground">Loading...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={v => {
              onPageSizeChange(Number(v));
              onPageChange(1); // Reset to first page on page size change
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map(size => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page > 1 ? page - 1 : 1)}
            disabled={page <= 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page < pageCount ? page + 1 : page)}
            disabled={page >= pageCount || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
} 
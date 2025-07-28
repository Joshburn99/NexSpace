import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TableLoadingSkeleton, EmptyState } from "./enhanced-loading-states";

export interface Column<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableAction<T> {
  label: string;
  icon?: React.ComponentType<any>;
  onClick: (row: T) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  disabled?: (row: T) => boolean;
}

interface EnhancedDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: TableAction<T>[];
  isLoading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  filterable?: boolean;
  exportable?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  pageSize?: number;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  className?: string;
}

export function EnhancedDataTable<T extends { id: string | number }>({
  data,
  columns,
  actions = [],
  isLoading = false,
  searchable = true,
  searchPlaceholder = "Search...",
  filterable = false,
  exportable = false,
  selectable = false,
  onSelectionChange,
  pageSize = 10,
  emptyStateTitle = "No data available",
  emptyStateDescription = "There are no records to display.",
  className = "",
}: EnhancedDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());
  const [filterConfig, setFilterConfig] = useState<Record<string, string>>({});

  // Filter and search data
  const filteredData = data.filter((row) => {
    // Search filter
    if (searchTerm) {
      const searchableValues = columns
        .map(col => String(row[col.key] || ''))
        .join(' ')
        .toLowerCase();
      if (!searchableValues.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }

    // Column filters
    for (const [key, value] of Object.entries(filterConfig)) {
      if (value && String(row[key as keyof T] || '').toLowerCase() !== value.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: keyof T) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(paginatedData.map(row => row.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string | number, checked: boolean) => {
    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedRows(newSelection);
    onSelectionChange?.(Array.from(newSelection).map(String));
  };

  const exportData = () => {
    const csvContent = [
      columns.map(col => col.title).join(','),
      ...sortedData.map(row =>
        columns.map(col => `"${String(row[col.key] || '')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data-export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <TableLoadingSkeleton rows={pageSize} columns={columns.length} />;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Table Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          
          {filterable && (
            <Select>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {/* Add filter options dynamically */}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex gap-2">
          {selectedRows.size > 0 && (
            <Badge variant="secondary" className="px-3 py-1">
              {selectedRows.size} selected
            </Badge>
          )}
          
          {exportable && (
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {paginatedData.length === 0 && !isLoading ? (
            <div className="p-8">
              <EmptyState
                title={emptyStateTitle}
                description={emptyStateDescription}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {selectable && (
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                  )}
                  
                  {columns.map((column) => (
                    <TableHead
                      key={String(column.key)}
                      className={cn(
                        column.sortable && "cursor-pointer hover:bg-gray-50",
                        column.width && `w-${column.width}`,
                        column.align === 'center' && "text-center",
                        column.align === 'right' && "text-right"
                      )}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center gap-2">
                        <span>{column.title}</span>
                        {column.sortable && (
                          <div className="flex flex-col">
                            {sortConfig?.key === column.key ? (
                              sortConfig.direction === 'asc' ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-50" />
                            )}
                          </div>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  
                  {actions.length > 0 && (
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {paginatedData.map((row) => (
                  <TableRow key={String(row.id)} className="hover:bg-gray-50">
                    {selectable && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(row.id)}
                          onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                    )}
                    
                    {columns.map((column) => (
                      <TableCell
                        key={String(column.key)}
                        className={cn(
                          column.align === 'center' && "text-center",
                          column.align === 'right' && "text-right"
                        )}
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : String(row[column.key] || '')
                        }
                      </TableCell>
                    ))}
                    
                    {actions.length > 0 && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {actions.map((action, index) => (
                            <Button
                              key={index}
                              variant={action.variant || "ghost"}
                              size="sm"
                              onClick={() => action.onClick(row)}
                              disabled={action.disabled?.(row)}
                              className="h-8 w-8 p-0"
                            >
                              {action.icon ? (
                                <action.icon className="h-4 w-4" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-gray-600">
            Showing {Math.min((currentPage - 1) * pageSize + 1, sortedData.length)} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
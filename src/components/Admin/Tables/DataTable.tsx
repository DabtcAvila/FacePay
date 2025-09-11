'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Download,
  Filter,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  title?: string;
  searchable?: boolean;
  exportable?: boolean;
  filterable?: boolean;
  loading?: boolean;
  onExport?: () => void;
}

export default function DataTable<T>({
  data,
  columns,
  title,
  searchable = true,
  exportable = true,
  filterable = true,
  loading = false,
  onExport,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  const activeFiltersCount = columnFilters.length + (globalFilter ? 1 : 0);

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl dark:bg-gray-900/80 dark:border-gray-700/30">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/4"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl overflow-hidden dark:bg-gray-900/80 dark:border-gray-700/30">
      {/* Header */}
      <div className="px-6 py-6 border-b border-white/20 bg-gradient-to-r from-white/50 to-gray-50/50 dark:border-gray-700/30 dark:from-gray-900/50 dark:to-gray-800/50">
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                {title}
              </h3>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {table.getFilteredRowModel().rows.length} resultados encontrados
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {searchable && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(String(e.target.value))}
                  className="block w-64 pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm placeholder-gray-400 bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 backdrop-blur-sm transition-all duration-200"
                  placeholder="Buscar en la tabla..."
                />
              </div>
            )}
            
            {filterable && (
              <div className="relative">
                <button className="inline-flex items-center px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm transition-all duration-200">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            )}
            
            {exportable && (
              <button
                onClick={onExport}
                className="inline-flex items-center px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm transition-all duration-200"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </button>
            )}
          </div>
        </div>

        {/* Active filters */}
        {activeFiltersCount > 0 && (
          <div className="mt-3 flex items-center space-x-2">
            {globalFilter && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                Buscar: {globalFilter}
                <button
                  onClick={() => setGlobalFilter('')}
                  className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
          <thead className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-900/80">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          "flex items-center space-x-1",
                          header.column.getCanSort() && "cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </span>
                        {header.column.getCanSort() && (
                          <span className="flex flex-col">
                            <ChevronUp 
                              className={cn(
                                "h-3 w-3",
                                header.column.getIsSorted() === 'asc' 
                                  ? 'text-gray-700 dark:text-gray-300' 
                                  : 'text-gray-400'
                              )} 
                            />
                            <ChevronDown 
                              className={cn(
                                "h-3 w-3 -mt-1",
                                header.column.getIsSorted() === 'desc' 
                                  ? 'text-gray-700 dark:text-gray-300' 
                                  : 'text-gray-400'
                              )} 
                            />
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white/60 dark:bg-gray-900/60 divide-y divide-gray-200/30 dark:divide-gray-700/30">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-white/80 dark:hover:bg-gray-800/60 transition-colors duration-150">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-gradient-to-r from-white/50 to-gray-50/50 dark:from-gray-900/50 dark:to-gray-800/50 px-6 py-4 border-t border-white/20 dark:border-gray-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            Mostrando{' '}
            <span className="font-semibold text-gray-900 dark:text-white mx-1">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            </span>
            a{' '}
            <span className="font-semibold text-gray-900 dark:text-white mx-1">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </span>
            de{' '}
            <span className="font-semibold text-gray-900 dark:text-white mx-1">
              {table.getFilteredRowModel().rows.length}
            </span>
            resultados
          </div>
          
          <div className="flex items-center">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-gray-300 dark:border-gray-600 bg-white/60 dark:bg-gray-800/60 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 backdrop-blur-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className="relative inline-flex items-center px-4 py-2 border-t border-b border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 text-sm font-semibold text-gray-700 dark:text-gray-300 backdrop-blur-sm">
              Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </span>
            
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="relative inline-flex items-center px-3 py-2 rounded-r-xl border border-gray-300 dark:border-gray-600 bg-white/60 dark:bg-gray-800/60 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 backdrop-blur-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
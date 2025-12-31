"use client";

import React, { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";

/**
 * DataTableViewer - Sortable/filterable data table
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string[]} props.columns - Column headers
 * @param {any[][]} props.rows - Table data (2D array)
 * @param {boolean} props.sortable - Allow sorting
 * @param {boolean} props.filterable - Allow filtering
 */
export default function DataTableViewer({
  id,
  columns = [],
  rows = [],
  sortable = true,
  filterable = true,
}) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [filterText, setFilterText] = useState("");

  const handleSort = (columnIndex) => {
    if (!sortable) return;

    if (sortColumn === columnIndex) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(columnIndex);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    let result = [...rows];

    // Filter
    if (filterText && filterable) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter((row) =>
        row.some((cell) =>
          String(cell).toLowerCase().includes(lowerFilter)
        )
      );
    }

    // Sort
    if (sortColumn !== null && sortable) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        // Try numeric comparison
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
        }

        // String comparison
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        if (sortDirection === "asc") {
          return aStr.localeCompare(bStr);
        }
        return bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [rows, filterText, filterable, sortColumn, sortDirection, sortable]);

  if (!columns.length || !rows.length) {
    return (
      <div
        id={id}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"
      >
        <p className="text-sm text-[var(--muted-foreground)]">
          No table data provided
        </p>
      </div>
    );
  }

  return (
    <div id={id} className="v2-data-table-viewer space-y-3">
      {/* Filter */}
      {filterable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Filter table..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--border)]
              bg-[var(--surface-2)] text-[var(--foreground)]
              focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
              placeholder:text-[var(--muted-foreground)]"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--surface-2)]">
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={`
                      px-4 py-3 text-left text-sm font-semibold text-[var(--foreground)]
                      border-b border-[var(--border)]
                      ${sortable ? "cursor-pointer hover:bg-[var(--surface-1)] select-none" : ""}
                    `}
                    onClick={() => handleSort(index)}
                  >
                    <div className="flex items-center gap-2">
                      {column}
                      {sortable && (
                        <span className="text-[var(--muted-foreground)]">
                          {sortColumn === index ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-4 h-4" />
                            ) : (
                              <ArrowDown className="w-4 h-4" />
                            )
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-30" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-2)]/50"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-3 text-sm text-[var(--foreground)]"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* No results */}
        {filteredAndSortedRows.length === 0 && (
          <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">
            No matching rows found
          </div>
        )}
      </div>

      {/* Row count */}
      <div className="text-xs text-[var(--muted-foreground)]">
        Showing {filteredAndSortedRows.length} of {rows.length} rows
      </div>
    </div>
  );
}

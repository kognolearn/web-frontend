"use client";

import React, { useState, useCallback } from "react";

/**
 * TableInput - Editable table cells
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string[][]} [props.value] - Current table values (2D array)
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string[]} props.columns - Column headers
 * @param {number} props.rows - Number of editable rows
 * @param {string[][]} [props.initial_values] - Initial cell values
 */
export default function TableInput({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  columns = [],
  rows = 3,
  initial_values,
}) {
  // Initialize table with initial values or empty cells
  const initTable = () => {
    const table = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < columns.length; c++) {
        row.push(initial_values?.[r]?.[c] ?? "");
      }
      table.push(row);
    }
    return table;
  };

  const [tableData, setTableData] = useState(value || initTable());

  const currentData = value !== undefined ? value : tableData;

  const handleCellChange = useCallback((rowIndex, colIndex, cellValue) => {
    const newData = currentData.map((row, ri) =>
      row.map((cell, ci) =>
        ri === rowIndex && ci === colIndex ? cellValue : cell
      )
    );
    setTableData(newData);
    onChange?.(newData);
  }, [currentData, onChange]);

  // Get cell grade status
  const getCellStatus = (rowIndex, colIndex) => {
    if (!isGraded || !grade?.expected) return null;
    const expected = grade.expected[rowIndex]?.[colIndex];
    const actual = currentData[rowIndex]?.[colIndex];

    if (expected === undefined) return null;
    return String(actual).trim().toLowerCase() ===
      String(expected).trim().toLowerCase()
      ? "correct"
      : "incorrect";
  };

  // Determine overall border color
  let borderClass = "border-[var(--border)]";
  if (isGraded && grade) {
    if (grade.passed) {
      borderClass = "border-emerald-500";
    } else {
      borderClass = "border-rose-500";
    }
  }

  return (
    <div id={id} className="v2-table-input">
      <div className={`rounded-xl border ${borderClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--surface-2)]">
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left text-sm font-semibold text-[var(--foreground)] border-b border-[var(--border)]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-[var(--border)] last:border-b-0"
                >
                  {row.map((cell, colIndex) => {
                    const status = getCellStatus(rowIndex, colIndex);

                    let cellClass = "";
                    if (status === "correct") {
                      cellClass = "bg-emerald-500/10";
                    } else if (status === "incorrect") {
                      cellClass = "bg-rose-500/10";
                    }

                    return (
                      <td key={colIndex} className={`px-2 py-2 ${cellClass}`}>
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) =>
                            handleCellChange(rowIndex, colIndex, e.target.value)
                          }
                          disabled={disabled || isGraded}
                          className={`
                            w-full px-2 py-1.5 rounded-lg border
                            ${
                              status === "correct"
                                ? "border-emerald-500"
                                : status === "incorrect"
                                ? "border-rose-500"
                                : "border-[var(--border)]"
                            }
                            bg-[var(--surface-1)] text-[var(--foreground)] text-sm
                            focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
                            disabled:opacity-50 disabled:cursor-not-allowed
                          `}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Show correct values if wrong */}
      {isGraded && !grade?.passed && grade?.expected && (
        <div className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
            Correct values:
          </p>
          <div className="text-sm text-[var(--foreground)] overflow-x-auto">
            <table className="w-full">
              <tbody>
                {grade.expected.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1 border border-[var(--border)]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <p className={`mt-3 text-sm ${
          grade.passed
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}>
          {grade.feedback}
        </p>
      )}
    </div>
  );
}

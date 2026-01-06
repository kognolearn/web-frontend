"use client";

import React, { useMemo, useRef, useState } from "react";

const SQL_WASM_URL = "https://sql.js.org/dist/sql-wasm.js";
const SQL_WASM_BASE = "https://sql.js.org/dist/";
let sqlJsPromise = null;

const loadSqlJs = () => {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  if (window.initSqlJs) {
    return window.initSqlJs({ locateFile: (file) => `${SQL_WASM_BASE}${file}` });
  }
  if (sqlJsPromise) return sqlJsPromise;

  sqlJsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-sqljs]");
    const handleLoad = async () => {
      try {
        const runtime = await window.initSqlJs({
          locateFile: (file) => `${SQL_WASM_BASE}${file}`,
        });
        resolve(runtime);
      } catch (err) {
        reject(err);
      }
    };

    if (existing) {
      existing.addEventListener("load", handleLoad);
      existing.addEventListener("error", () => reject(new Error("SQL.js load failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = SQL_WASM_URL;
    script.async = true;
    script.dataset["sqljs"] = "true";
    script.onload = handleLoad;
    script.onerror = () => reject(new Error("SQL.js load failed"));
    document.head.appendChild(script);
  });

  return sqlJsPromise;
};

/**
 * SQLWorkbench - Query editor with schema explorer
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Array<{name: string, columns: Array, sample_data?: Array}>} props.database_schema
 * @param {string} [props.initial_query]
 * @param {boolean} [props.readonly_schema=true]
 * @param {boolean} [props.show_schema_explorer=true]
 */
export default function SQLWorkbench({
  id,
  database_schema = [],
  initial_query = "",
  readonly_schema = true,
  show_schema_explorer = true,
  value,
  onChange,
}) {
  const [query, setQuery] = useState(value || initial_query);
  const [result, setResult] = useState({ error: "", rows: [] });
  const [isRunning, setIsRunning] = useState(false);
  const schema = useMemo(() => database_schema.filter(Boolean), [database_schema]);
  const sqlRef = useRef(null);

  const buildDatabase = async () => {
    if (!sqlRef.current) {
      sqlRef.current = await loadSqlJs();
    }
    const SQL = sqlRef.current;
    if (!SQL) {
      throw new Error("SQL runtime unavailable.");
    }
    const db = new SQL.Database();

    schema.forEach((table) => {
      const columns = table.columns || [];
      const columnDefs = columns
        .map((col) => `${col.name} ${col.type}`)
        .join(", ");
      db.run(`CREATE TABLE ${table.name} (${columnDefs});`);

      if (Array.isArray(table.sample_data) && table.sample_data.length > 0) {
        const placeholders = columns.map(() => "?").join(", ");
        const stmt = db.prepare(
          `INSERT INTO ${table.name} VALUES (${placeholders});`
        );
        table.sample_data.forEach((row) => {
          stmt.run(row);
        });
        stmt.free();
      }
    });

    return db;
  };

  const handleRun = async () => {
    setIsRunning(true);
    setResult({ error: "", rows: [] });
    try {
      const db = await buildDatabase();
      const statements = query.split(";").filter((stmt) => stmt.trim());
      let lastResult = null;
      statements.forEach((stmt) => {
        lastResult = db.exec(stmt);
      });
      if (!lastResult || lastResult.length === 0) {
        setResult({ error: "", rows: [["Query executed."]] });
        return;
      }
      const { columns, values } = lastResult[0];
      setResult({ error: "", rows: [columns, ...values] });
    } catch (err) {
      setResult({ error: err?.message || String(err), rows: [] });
    } finally {
      setIsRunning(false);
    }
  };

  const handleChange = (event) => {
    setQuery(event.target.value);
    onChange?.(event.target.value);
  };

  return (
    <div id={id} className="v2-sql-workbench space-y-4">
      {show_schema_explorer && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Schema {readonly_schema ? "(read-only)" : ""}
          </div>
          <div className="mt-3 space-y-3">
            {schema.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">
                No schema provided.
              </p>
            )}
            {schema.map((table) => (
              <div
                key={table.name}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
              >
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  {table.name}
                </div>
                <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {table.columns?.map((col) => (
                    <div key={`${table.name}-${col.name}`}>
                      {col.name} ({col.type})
                    </div>
                  ))}
                </div>
                {table.sample_data?.length ? (
                  <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Sample rows: {table.sample_data.length}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Query
        </div>
        <textarea
          value={query}
          onChange={handleChange}
          rows={6}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
          placeholder="SELECT * FROM table_name;"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleRun}
            className="rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[var(--primary)]/30 hover:shadow-[var(--primary)]/50 transition-all disabled:opacity-60"
            disabled={isRunning}
          >
            {isRunning ? "Running..." : "Run Query"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--foreground)]">
        {result.error && (
          <p className="text-sm text-[var(--danger)]">{result.error}</p>
        )}
        {!result.error && result.rows.length === 0 && (
          <span className="text-[var(--muted-foreground)]">
            Results will appear here.
          </span>
        )}
        {result.rows.length > 0 && (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <tbody>
                {result.rows.map((row, idx) => (
                  <tr key={`row-${idx}`} className="border-b border-[var(--border)]/40">
                    {row.map((cell, cellIdx) => (
                      <td key={`cell-${idx}-${cellIdx}`} className="px-2 py-1">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

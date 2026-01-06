"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import CodeEditor from "../input/CodeEditor";

const DEFAULT_TIMEOUT_MS = 5000;
const SUPPORTED_PREVIEW_LANGS = ["javascript", "typescript", "python", "sql", "html_css"];
const PYODIDE_BASE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/";
const SQL_WASM_URL = "https://sql.js.org/dist/sql-wasm.js";
const SQL_WASM_BASE = "https://sql.js.org/dist/";
let pyodidePromise = null;
let sqlJsPromise = null;

const buildIframeDoc = () => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: system-ui, sans-serif; margin: 12px; color: #111; }
      pre { white-space: pre-wrap; word-break: break-word; }
    </style>
  </head>
  <body>
    <pre id="output"></pre>
    <script>
      const outputEl = document.getElementById("output");
      const log = (...args) => {
        outputEl.textContent += args.join(" ") + "\\n";
      };
      window.addEventListener("message", async (event) => {
        const payload = event.data || {};
        outputEl.textContent = "";
        if (payload.type !== "run") return;
        try {
          const fn = new Function(payload.code);
          const result = fn();
          if (result !== undefined) log(String(result));
        } catch (err) {
          log("Error:", err?.message || String(err));
        }
      });
    </script>
  </body>
</html>
`;

const loadPyodideRuntime = async () => {
  if (typeof window === "undefined") return null;
  if (window.loadPyodide) {
    return window.loadPyodide({ indexURL: PYODIDE_BASE_URL });
  }
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-pyodide]");
    const onReady = async () => {
      try {
        const runtime = await window.loadPyodide({ indexURL: PYODIDE_BASE_URL });
        resolve(runtime);
      } catch (err) {
        reject(err);
      }
    };

    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () => reject(new Error("Pyodide load failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = `${PYODIDE_BASE_URL}pyodide.js`;
    script.async = true;
    script.dataset["pyodide"] = "true";
    script.onload = onReady;
    script.onerror = () => reject(new Error("Pyodide load failed"));
    document.head.appendChild(script);
  });
  return pyodidePromise;
};

const loadSqlJsRuntime = () => {
  if (typeof window === "undefined") return Promise.resolve(null);
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
 * CodePlayground - Multi-purpose code sandbox
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} props.language
 * @param {string} props.initial_code
 * @param {number[]} [props.readonly_lines]
 * @param {string} [props.hidden_setup]
 * @param {string} [props.hidden_teardown]
 * @param {'console' | 'html' | 'canvas' | 'table'} [props.output_type='console']
 * @param {number} [props.time_limit_ms=5000]
 * @param {number} [props.memory_limit_mb=64]
 */
export default function CodePlayground({
  id,
  language = "javascript",
  initial_code = "",
  readonly_lines,
  hidden_setup,
  hidden_teardown,
  output_type = "console",
  time_limit_ms = DEFAULT_TIMEOUT_MS,
  memory_limit_mb = 64,
  value,
  onChange,
}) {
  const [code, setCode] = useState(value || initial_code);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("idle");
  const iframeRef = useRef(null);
  const pyodideRef = useRef(null);
  const sqlRef = useRef(null);

  const handleCodeChange = (next) => {
    setCode(next);
    onChange?.(next);
  };

  const runJavascript = useCallback(
    async (source) => {
      if (!iframeRef.current) return;
      iframeRef.current.contentWindow?.postMessage({ type: "run", code: source }, "*");
    },
    []
  );

  const runTypescript = useCallback(async (source) => {
    const ts = await import("typescript");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.ESNext },
    });
    await runJavascript(compiled.outputText);
  }, [runJavascript]);

  const runPython = useCallback(
    async (source) => {
      if (!pyodideRef.current) {
        pyodideRef.current = await loadPyodideRuntime();
      }
      const pyodide = pyodideRef.current;
      if (!pyodide) {
        setOutput("Python preview unavailable.");
        return;
      }
      const wrapped = `
import sys, io
_stdout = io.StringIO()
sys.stdout = _stdout
try:
  exec(${JSON.stringify(source)}, {})
finally:
  sys.stdout = sys.__stdout__
_stdout.getvalue()
`;
      const result = await pyodide.runPythonAsync(wrapped);
      setOutput(result || "");
    },
    []
  );

  const runSql = useCallback(
    async (source) => {
      if (!sqlRef.current) {
        sqlRef.current = await loadSqlJsRuntime();
      }
      const SQL = sqlRef.current;
      if (!SQL) {
        setOutput("SQL preview unavailable.");
        return;
      }
      const db = new SQL.Database();
      const statements = source.split(";").filter((stmt) => stmt.trim());
      let lastResult = null;
      statements.forEach((stmt) => {
        lastResult = db.exec(stmt);
      });
      if (!lastResult || lastResult.length === 0) {
        setOutput("Query executed.");
        return;
      }
      const { columns, values } = lastResult[0];
      const table = [columns.join("\t"), ...values.map((row) => row.join("\t"))].join("\n");
      setOutput(table);
    },
    []
  );

  const runHtml = useCallback(
    async (source) => {
      if (!iframeRef.current) return;
      iframeRef.current.srcdoc = source;
    },
    []
  );

  const handleRun = useCallback(async () => {
    const normalized = String(language || "").toLowerCase();
    if (!SUPPORTED_PREVIEW_LANGS.includes(normalized)) {
      setOutput("Preview not available for this language.");
      return;
    }
    setStatus("running");
    setOutput("");

    const fullSource = [hidden_setup, code, hidden_teardown].filter(Boolean).join("\n");

    try {
      if (normalized === "javascript") {
        await runJavascript(fullSource);
      } else if (normalized === "typescript") {
        await runTypescript(fullSource);
      } else if (normalized === "python") {
        await runPython(fullSource);
      } else if (normalized === "sql") {
        await runSql(fullSource);
      } else if (normalized === "html_css") {
        await runHtml(fullSource);
      }
    } catch (err) {
      setOutput(err?.message || String(err));
    } finally {
      setStatus("idle");
    }
  }, [language, hidden_setup, hidden_teardown, code, runJavascript, runTypescript, runPython, runSql, runHtml]);

  useEffect(() => {
    if (output_type === "console" && iframeRef.current) {
      iframeRef.current.srcdoc = buildIframeDoc();
    }
  }, [output_type]);

  return (
    <div id={id} className="v2-code-playground space-y-4">
      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span className="uppercase tracking-wide">{language}</span>
        <span>
          {time_limit_ms}ms / {memory_limit_mb}MB
        </span>
      </div>

      <CodeEditor
        language={language}
        initial_code={initial_code}
        readonly_lines={readonly_lines}
        value={code}
        onChange={handleCodeChange}
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleRun}
          className="rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[var(--primary)]/30 hover:shadow-[var(--primary)]/50 transition-all disabled:opacity-60"
          disabled={status === "running"}
        >
          {status === "running" ? "Running..." : "Run"}
        </button>
      </div>

      {output_type === "console" && (
        <>
          <iframe
            ref={iframeRef}
            title="Console Preview"
            sandbox="allow-scripts"
            className="h-40 w-full rounded-2xl border border-[var(--border)] bg-white"
          />
          {output && (
            <pre className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs text-[var(--foreground)] whitespace-pre-wrap break-words">
              {output}
            </pre>
          )}
        </>
      )}

      {output_type !== "console" && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <iframe
            ref={iframeRef}
            title="Live Preview"
            sandbox="allow-scripts allow-same-origin"
            className="h-64 w-full rounded-xl bg-white"
          />
        </div>
      )}

      {output && output_type === "console" && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--foreground)]">
          <pre className="whitespace-pre-wrap break-words">{output}</pre>
        </div>
      )}
    </div>
  );
}

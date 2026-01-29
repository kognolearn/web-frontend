"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReadingRenderer from "@/components/content/ReadingRenderer";
import { authFetch } from "@/lib/api";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export default function MediaCohesionTab() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [showInput, setShowInput] = useState(false);

  const loadTests = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/api/admin/media-cohesion/tests");
      if (!res.ok) {
        throw new Error(`Failed to load tests (${res.status})`);
      }
      const data = await res.json();
      const list = Array.isArray(data.tests) ? data.tests : [];
      setTests(list);
      if (list.length > 0 && !activeId) {
        setActiveId(list[0].id);
      }
    } catch (err) {
      setError(err?.message || "Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  const runTest = async () => {
    setRunning(true);
    setError("");
    try {
      const res = await authFetch("/api/admin/media-cohesion/tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Failed to run test (${res.status})`);
      }
      const test = data.test;
      if (test) {
        setTests((prev) => [test, ...prev.filter((item) => item.id !== test.id)]);
        setActiveId(test.id);
      } else {
        await loadTests();
      }
    } catch (err) {
      setError(err?.message || "Failed to run test");
    } finally {
      setRunning(false);
    }
  };

  const activeTest = useMemo(() => tests.find((t) => t.id === activeId) || null, [tests, activeId]);
  const readingContent = showInput
    ? activeTest?.input_reading
    : activeTest?.output_reading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Media Cohesion Tests</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Run a simulated reading and verify that media details are woven into the text.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={runTest}
            disabled={running}
          >
            {running ? "Running..." : "Run Default Test"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={loadTests}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="card p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Test Runs
          </div>
          {loading ? (
            <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
          ) : tests.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No runs yet. Click "Run Default Test".</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {tests.map((test) => (
                <button
                  key={test.id}
                  type="button"
                  onClick={() => setActiveId(test.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors ${
                    activeId === test.id
                      ? "border-[var(--primary)] bg-[var(--surface-2)]"
                      : "border-[var(--border)] bg-transparent hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <div className="font-medium text-[var(--foreground)] truncate">
                    {test.title || "Media Cohesion Run"}
                  </div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">
                    {formatDate(test.created_at)}
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                    Status: {test.status || "unknown"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">Rendered Reading</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                {activeTest?.title || "Select a run to view its reading"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`btn btn-xs ${showInput ? "btn-ghost" : "btn-primary"}`}
                onClick={() => setShowInput(false)}
                disabled={!activeTest}
              >
                Output
              </button>
              <button
                type="button"
                className={`btn btn-xs ${showInput ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setShowInput(true)}
                disabled={!activeTest}
              >
                Input
              </button>
            </div>
          </div>

          <div className="card p-4">
            {readingContent ? (
              <ReadingRenderer content={readingContent} />
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">No reading selected yet.</p>
            )}
          </div>

          {activeTest?.analyses && (
            <div className="card p-4">
              <h4 className="text-sm font-semibold mb-2">Media Analyses (raw)</h4>
              <pre className="text-xs whitespace-pre-wrap text-[var(--muted-foreground)]">
                {JSON.stringify(activeTest.analyses, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

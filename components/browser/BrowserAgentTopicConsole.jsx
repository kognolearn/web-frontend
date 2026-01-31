"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch, getAccessToken } from "@/lib/api";
import { useCourseCreationFlow } from "@/hooks/useCourseCreationFlow";
import BrowserViewer from "@/components/browser/BrowserViewer";
import TopicSearchOptions from "@/components/browser/TopicSearchOptions";

const filterReasoningDetails = (details) => {
  if (!details) return null;
  if (!Array.isArray(details)) return details;
  return details.filter((entry) => entry?.type !== "reasoning.encrypted");
};

const parseModelOutput = (raw) => {
  if (!raw || typeof raw !== "string") {
    return { raw: "" };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const reasoningDetails = filterReasoningDetails(parsed.reasoning_details);
      return { parsed: { ...parsed, reasoning_details: reasoningDetails } };
    }
  } catch {
    // fall through
  }
  return { raw };
};

const formatToolCalls = (toolCalls = []) => {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return [];
  return toolCalls.map((call) => {
    const fn = call.function || {};
    let args = fn.arguments || "";
    try {
      args = typeof args === "string" ? JSON.parse(args) : args;
    } catch {
      // keep as-is
    }
    return {
      id: call.id || call.tool_call_id || "",
      name: fn.name || call.name || "unknown",
      arguments: args,
    };
  });
};

const ModelOutputPanel = ({ title, output }) => {
  const parsed = parseModelOutput(output);
  if (!parsed.raw && !parsed.parsed) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
          {title}
        </div>
        <div className="mt-2 text-xs text-[var(--muted-foreground)]">No output yet.</div>
      </div>
    );
  }

  if (parsed.raw) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
          {title}
        </div>
        <div className="mt-2 max-h-60 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-2 text-xs text-[var(--foreground)] whitespace-pre-wrap">
          {parsed.raw}
        </div>
      </div>
    );
  }

  const payload = parsed.parsed || {};
  const toolCalls = formatToolCalls(payload.tool_calls || []);
  const reasoningDetails = payload.reasoning_details;
  const otherFields = { ...payload };
  delete otherFields.role;
  delete otherFields.content;
  delete otherFields.tool_calls;
  delete otherFields.reasoning_details;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
        {title}
      </div>
      <div className="mt-2 grid gap-3">
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-2">
          <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Role</div>
          <div className="mt-1 text-xs text-[var(--foreground)]">
            {payload.role || "unknown"}
          </div>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-2">
          <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Content</div>
          <div className="mt-1 text-xs text-[var(--foreground)] whitespace-pre-wrap">
            {payload.content || "—"}
          </div>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-2">
          <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Tool Calls</div>
          {toolCalls.length === 0 ? (
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">None</div>
          ) : (
            <div className="mt-2 space-y-2">
              {toolCalls.map((call, idx) => (
                <div key={call.id || idx} className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-2">
                  <div className="text-xs text-[var(--foreground)] font-semibold">{call.name}</div>
                  <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                    ID: {call.id || "—"}
                  </div>
                  <pre className="mt-2 text-[11px] text-[var(--foreground)] whitespace-pre-wrap">
                    {typeof call.arguments === "string"
                      ? call.arguments
                      : JSON.stringify(call.arguments, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
        {reasoningDetails ? (
          <div className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-2">
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Reasoning</div>
            <pre className="mt-2 text-[11px] text-[var(--foreground)] whitespace-pre-wrap">
              {typeof reasoningDetails === "string"
                ? reasoningDetails
                : JSON.stringify(reasoningDetails, null, 2)}
            </pre>
          </div>
        ) : null}
        {Object.keys(otherFields).length > 0 ? (
          <div className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-2">
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Other Fields</div>
            <pre className="mt-2 text-[11px] text-[var(--foreground)] whitespace-pre-wrap">
              {JSON.stringify(otherFields, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default function BrowserAgentTopicConsole({ className = "" }) {
  const flow = useCourseCreationFlow();
  const {
    userId,
    courseTitle,
    setCourseTitle,
    collegeName,
    setCollegeName,
    studyMode,
    setStudyMode,
    studyHours,
    setStudyHours,
    studyMinutes,
    setStudyMinutes,
    hasExamMaterials,
    setHasExamMaterials,
    syllabusText,
    setSyllabusText,
    syllabusFiles,
    handleSyllabusFileChange,
    handleRemoveSyllabusFile,
    examNotes,
    setExamNotes,
    examFiles,
    handleExamFileChange,
    handleRemoveExamFile,
    agentSearchEnabled,
    setAgentSearchEnabled,
    browserAgentEnabled,
    setBrowserAgentEnabled,
    manualUploadEnabled,
    setManualUploadEnabled,
    browserSession,
    setBrowserSession,
    pendingBrowserJobSessionId,
    handleBrowserSessionClosed,
    handleBrowserJobStarted,
    handleGenerateTopics,
    courseReport,
    isTopicsLoading,
    topicsError,
    syllabusFileTypes,
    generatedContentOutdated,
    generatedContentOutdatedReason,
  } = flow;

  const [browserAuthToken, setBrowserAuthToken] = useState(null);
  const [debugAgentState, setDebugAgentState] = useState(null);
  const [debugExplorers, setDebugExplorers] = useState([]);

  const canStartTopics = useMemo(() => {
    return Boolean(courseTitle.trim() && collegeName.trim() && !isTopicsLoading);
  }, [courseTitle, collegeName, isTopicsLoading]);

  useEffect(() => {
    if (!browserSession) {
      setBrowserAuthToken(null);
      return;
    }
    let mounted = true;
    getAccessToken().then((token) => {
      if (mounted) setBrowserAuthToken(token);
    });
    return () => {
      mounted = false;
    };
  }, [browserSession]);

  const handleCloseBrowserViewer = useCallback(async () => {
    const sessionId = browserSession?.sessionId;
    if (sessionId) {
      try {
        await authFetch(`/api/browser-session/${sessionId}`, { method: "DELETE" });
      } catch (error) {
        console.warn("[BrowserAgentConsole] Failed to close session:", error);
      }
    }
    setBrowserSession(null);
    handleBrowserSessionClosed?.();
  }, [browserSession, handleBrowserSessionClosed, setBrowserSession]);

  const handleClearActiveBrowserSession = useCallback(async () => {
    try {
      await authFetch(`/api/browser-session/active`, { method: "DELETE" });
    } catch (error) {
      console.warn("[BrowserAgentConsole] Failed to clear active session:", error);
    } finally {
      setBrowserSession(null);
      handleBrowserSessionClosed?.();
    }
  }, [handleBrowserSessionClosed, setBrowserSession]);

  const handleSyllabusUpload = useCallback(
    (event) => {
      const files = Array.from(event.target.files || []);
      if (files.length) {
        handleSyllabusFileChange(files);
      }
      event.target.value = "";
    },
    [handleSyllabusFileChange]
  );

  const handleRunReport = useCallback(() => {
    handleGenerateTopics({ reportMode: true, debugStepMode: true });
  }, [handleGenerateTopics]);

  const handleExamUpload = useCallback(
    (event) => {
      const files = Array.from(event.target.files || []);
      if (files.length) {
        handleExamFileChange(files);
      }
      event.target.value = "";
    },
    [handleExamFileChange]
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="card p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Browser Agent Course Report</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Single-page replica of the course discovery flow for fast browser agent testing.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Course Title</label>
            <input
              type="text"
              value={courseTitle}
              onChange={(event) => setCourseTitle(event.target.value)}
              placeholder="e.g., CS 61A"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">University / Institution</label>
            <input
              type="text"
              value={collegeName}
              onChange={(event) => setCollegeName(event.target.value)}
              placeholder="e.g., UC Berkeley"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Study Mode</label>
            <select
              value={studyMode}
              onChange={(event) => setStudyMode(event.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
            >
              <option value="deep">Deep Study</option>
              <option value="cram">Cram Mode</option>
            </select>
          </div>
          <div className={`space-y-2 ${studyMode === "cram" ? "" : "opacity-60"}`}>
            <label className="text-sm font-medium">Study Hours</label>
            <input
              type="number"
              min={0}
              value={studyHours}
              onChange={(event) => setStudyHours(Number(event.target.value) || 0)}
              disabled={studyMode !== "cram"}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
            />
          </div>
          <div className={`space-y-2 ${studyMode === "cram" ? "" : "opacity-60"}`}>
            <label className="text-sm font-medium">Study Minutes</label>
            <input
              type="number"
              min={0}
              max={59}
              value={studyMinutes}
              onChange={(event) => setStudyMinutes(Number(event.target.value) || 0)}
              disabled={studyMode !== "cram"}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Source Options</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Match the same toggles used in the course creation flow.
          </p>
        </div>
        <div className="mt-4">
          <TopicSearchOptions
            agentSearchEnabled={agentSearchEnabled}
            setAgentSearchEnabled={setAgentSearchEnabled}
            browserAgentEnabled={browserAgentEnabled}
            setBrowserAgentEnabled={setBrowserAgentEnabled}
            manualUploadEnabled={manualUploadEnabled}
            setManualUploadEnabled={setManualUploadEnabled}
            disabled={isTopicsLoading}
          />
        </div>
      </div>

      {manualUploadEnabled && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold">Syllabus & Course Materials</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Paste notes or upload files for the agent to ground topics.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <textarea
                rows={5}
                value={syllabusText}
                onChange={(event) => setSyllabusText(event.target.value)}
                placeholder="Paste syllabus text, topic lists, or course details..."
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
              />

              <div>
                <label className="text-sm font-medium">Upload syllabus files</label>
                <input
                  type="file"
                  multiple
                  accept={syllabusFileTypes}
                  onChange={handleSyllabusUpload}
                  className="mt-2 block w-full text-sm text-[var(--muted-foreground)]"
                />
                {syllabusFiles.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {syllabusFiles.map((file) => (
                      <li
                        key={file.name}
                        className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSyllabusFile(file.name)}
                          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold">Exam Materials</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Include exam hints or practice tests to bias the topic map.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasExamMaterials}
                  onChange={(event) => setHasExamMaterials(event.target.checked)}
                />
                I have exam materials / practice tests
              </label>

              <textarea
                rows={5}
                value={examNotes}
                onChange={(event) => setExamNotes(event.target.value)}
                placeholder="Paste exam topics or hints..."
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
              />

              <div>
                <label className="text-sm font-medium">Upload exam files</label>
                <input
                  type="file"
                  multiple
                  accept={syllabusFileTypes}
                  onChange={handleExamUpload}
                  className="mt-2 block w-full text-sm text-[var(--muted-foreground)]"
                />
                {examFiles.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {examFiles.map((file) => (
                      <li
                        key={file.name}
                        className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExamFile(file.name)}
                          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Run Course Report</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              {browserAgentEnabled
                ? "A live browser session will open before report generation begins."
                : "The report will be generated immediately using the selected sources."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunReport}
            disabled={!canStartTopics}
            className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isTopicsLoading
              ? "Generating..."
              : browserAgentEnabled
                ? "Open Browser Agent"
                : "Build Report"}
          </button>
        </div>

        {topicsError && (
          <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
            <div className="flex flex-col gap-2">
              <span>{topicsError}</span>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRunReport}
                  className="text-sm underline"
                >
                  Try again
                </button>
                {/active browser session/i.test(topicsError || "") && (
                  <button
                    type="button"
                    onClick={handleClearActiveBrowserSession}
                    className="text-sm underline"
                  >
                    Clear browser session
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {browserSession && (
        <BrowserViewer
          sessionId={browserSession.sessionId}
          streamUrl={browserSession.streamUrl}
          userId={userId}
          authToken={browserAuthToken}
          onClose={handleCloseBrowserViewer}
          onJobStarted={handleBrowserJobStarted}
          onAgentStateChange={setDebugAgentState}
          onExplorersChange={setDebugExplorers}
        />
      )}

      {browserSession && (
        <div className="card p-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-[var(--foreground)]">Admin Debug</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Inspect the agent reasoning and explorer activity for this session.
            </p>
          </div>

          <div className="mt-4 grid gap-4">
            <ModelOutputPanel
              title="Main Agent Output"
              output={debugAgentState?.lastModelOutput}
            />
            <ModelOutputPanel
              title="Report Agent Output"
              output={debugAgentState?.reportModelOutput}
            />

            {Array.isArray(debugExplorers) && debugExplorers.length > 0 ? (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
                  Explorer Agents
                </div>
                <div className="mt-2 space-y-2 max-h-64 overflow-auto pr-1">
                  {debugExplorers.map((explorer) => (
                    <div
                      key={explorer.id}
                      className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-2"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <span className="font-semibold text-[var(--foreground)]">
                          {explorer.status || "unknown"}
                        </span>
                        {explorer.url ? <span>{explorer.url}</span> : null}
                      </div>
                      <div className="mt-2">
                        <ModelOutputPanel
                          title="Explorer Output"
                          output={explorer.lastModelOutput}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-[var(--muted-foreground)]">
                No explorer agents yet.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Course Report</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            The browser agent will summarize the course once it finishes exploring the content source.
          </p>
        </div>
        <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-4">
          {isTopicsLoading && !courseReport ? (
            <p className="text-sm text-[var(--muted-foreground)]">Generating report…</p>
          ) : courseReport ? (
            <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap">
              {courseReport}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              No report yet. Run the browser agent to generate one.
            </p>
          )}
        </div>
        {generatedContentOutdated && (
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            {generatedContentOutdatedReason}
          </p>
        )}
      </div>

      {pendingBrowserJobSessionId && !browserSession && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--muted-foreground)]">
          Waiting for browser session {pendingBrowserJobSessionId}...
        </div>
      )}
    </div>
  );
}

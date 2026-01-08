import { authFetch } from "@/lib/api";

const DEFAULT_DELAYS_MS = [2500, 3500, 5000, 8000, 10000];
const ASYNC_DISABLED_HINT = "async job processing is disabled";

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      reject(err);
      return;
    }

    let timeout;
    let onAbort;
    const cleanup = () => {
      if (signal && onAbort) {
        signal.removeEventListener("abort", onAbort);
      }
    };

    onAbort = () => {
      clearTimeout(timeout);
      cleanup();
      const err = new Error("Aborted");
      err.name = "AbortError";
      reject(err);
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
  });
}

function maybeParseJson(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function getAsyncDisabledMessage(status, payload) {
  if (status !== 503) return null;
  const messageCandidates = [
    payload?.error,
    payload?.message,
    payload?.detail,
    payload?.details,
  ];
  const raw = messageCandidates.find(
    (entry) => typeof entry === "string" && entry.trim()
  );
  if (raw && raw.toLowerCase().includes(ASYNC_DISABLED_HINT)) {
    return "Course processing is temporarily unavailable. Please try again soon.";
  }
  return null;
}

export function resolveJobId(payload) {
  if (!payload || typeof payload !== "object") return null;
  const candidates = [
    payload.jobId,
    payload.job_id,
    payload.job?.id,
    payload.job?.job_id,
    payload.data?.jobId,
    payload.data?.job_id,
    payload.result?.jobId,
    payload.result?.job_id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

export function extractJobPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.job && typeof payload.job === "object") return payload.job;
  if (payload.data?.job && typeof payload.data.job === "object") return payload.data.job;
  if (payload.result?.job && typeof payload.result.job === "object") return payload.result.job;
  return payload;
}

export function getJobErrorMessage(job) {
  const err = job?.error;
  if (!err) return null;
  if (typeof err === "string") return err;
  if (typeof err?.message === "string") return err.message;
  if (typeof err?.error === "string") return err.error;
  if (typeof err?.detail === "string") return err.detail;
  return "Job failed.";
}

export async function pollJob(jobId, { signal, onUpdate } = {}) {
  if (!jobId) {
    throw new Error("Missing jobId");
  }

  let attempt = 0;

  while (true) {
    if (signal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }

    const res = await authFetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      signal,
    });
    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = payload?.error || payload?.message || `Failed to fetch job (${res.status})`;
      throw new Error(message);
    }

    const job = extractJobPayload(payload);
    if (!job) {
      throw new Error("Invalid job status response.");
    }

    if (onUpdate) onUpdate(job);

    const status = typeof job.status === "string" ? job.status.toLowerCase() : "";
    const jobErrorMessage = getJobErrorMessage(job);

    if (jobErrorMessage) {
      throw new Error(jobErrorMessage);
    }

    if (status === "failed") {
      throw new Error("Job failed.");
    }

    if (status === "completed" || (job.finished_at && !job.error)) {
      return job;
    }

    const delay = DEFAULT_DELAYS_MS[Math.min(attempt, DEFAULT_DELAYS_MS.length - 1)];
    attempt += 1;
    await sleep(delay, signal);
  }
}

export async function resolveAsyncJobResponse(response, { signal, errorLabel } = {}) {
  const payload = await response.json().catch(() => ({}));
  const asyncDisabled = getAsyncDisabledMessage(response.status, payload);

  if (!response.ok) {
    const fallback = errorLabel
      ? `Failed to ${errorLabel} (${response.status})`
      : `Request failed (${response.status})`;
    const message =
      asyncDisabled ||
      payload?.error ||
      payload?.message ||
      payload?.detail ||
      payload?.details ||
      fallback;
    throw new Error(message);
  }

  const jobId = resolveJobId(payload);
  if (response.status === 202 || jobId) {
    if (!jobId) {
      throw new Error("Missing jobId from async response.");
    }
    const job = await pollJob(jobId, { signal });
    return { payload, job, result: maybeParseJson(job?.result ?? null) };
  }

  return { payload, job: null, result: maybeParseJson(payload) };
}

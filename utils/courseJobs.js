const STORAGE_KEY_PREFIX = "course_create_jobs:";

function getStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error parsing course job storage:", error);
    return null;
  }
}

function normalizeJob(job) {
  if (!job || typeof job !== "object") return null;
  const jobId = typeof job.jobId === "string" ? job.jobId.trim() : "";
  if (!jobId) return null;

  const normalized = { jobId };

  if (typeof job.statusUrl === "string" && job.statusUrl.trim()) {
    normalized.statusUrl = job.statusUrl.trim();
  }
  if (typeof job.courseId === "string" && job.courseId.trim()) {
    normalized.courseId = job.courseId.trim();
  }
  if (typeof job.courseTitle === "string" && job.courseTitle.trim()) {
    normalized.courseTitle = job.courseTitle.trim();
  }
  if (typeof job.status === "string" && job.status.trim()) {
    normalized.status = job.status.trim();
  }
  if (typeof job.createdAt === "string" && job.createdAt.trim()) {
    normalized.createdAt = job.createdAt.trim();
  } else {
    normalized.createdAt = new Date().toISOString();
  }

  return normalized;
}

export function getCourseCreateJobs(userId) {
  if (typeof window === "undefined" || !userId) return [];

  try {
    const key = getStorageKey(userId);
    const parsed = safeParse(localStorage.getItem(key));
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed.map(normalizeJob).filter(Boolean);
    if (normalized.length !== parsed.length) {
      localStorage.setItem(key, JSON.stringify(normalized));
    }
    return normalized;
  } catch (error) {
    console.error("Error reading course job storage:", error);
    return [];
  }
}

export function upsertCourseCreateJob(userId, job) {
  if (typeof window === "undefined" || !userId) return [];
  const normalized = normalizeJob(job);
  if (!normalized) return getCourseCreateJobs(userId);

  try {
    const key = getStorageKey(userId);
    const jobs = getCourseCreateJobs(userId);
    const index = jobs.findIndex((entry) => entry.jobId === normalized.jobId);

    if (index === -1) {
      jobs.push(normalized);
    } else {
      const existing = jobs[index];
      jobs[index] = {
        ...existing,
        ...normalized,
        createdAt: existing.createdAt || normalized.createdAt,
      };
    }

    localStorage.setItem(key, JSON.stringify(jobs));
    return jobs;
  } catch (error) {
    console.error("Error saving course job storage:", error);
    return [];
  }
}

export function removeCourseCreateJob(userId, jobId) {
  if (typeof window === "undefined" || !userId || !jobId) return [];

  try {
    const key = getStorageKey(userId);
    const jobs = getCourseCreateJobs(userId);
    const next = jobs.filter((entry) => entry.jobId !== jobId);
    localStorage.setItem(key, JSON.stringify(next));
    return next;
  } catch (error) {
    console.error("Error removing course job storage:", error);
    return [];
  }
}

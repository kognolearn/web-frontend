/**
 * API client for onboarding flow.
 */

import { authFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase/client";

const backendBaseUrl = (process.env.NEXT_PUBLIC_BACKEND_API_URL || '').replace(/\/$/, '');
const API_PREFIX = backendBaseUrl ? `${backendBaseUrl}/onboarding` : '/api/onboarding';
const ANON_USER_ID_KEY = 'kogno_anon_user_id';
const ONBOARDING_SESSION_KEY = 'kogno_onboarding_session_v1';
const ONBOARDING_GATE_COURSE_KEY = 'kogno_onboarding_gate_course_id';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value);

const generateUuid = () => {
    if (typeof crypto !== 'undefined') {
        if (typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        if (typeof crypto.getRandomValues === 'function') {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;
            const toHex = (n) => n.toString(16).padStart(2, '0');
            const hex = Array.from(bytes, toHex).join('');
            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }
    }
    // Last-resort fallback for older environments.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

const readAnonUserId = () => {
    if (typeof window === 'undefined') return null;
    try {
        const existing = window.localStorage.getItem(ANON_USER_ID_KEY);
        return isValidUuid(existing) ? existing : null;
    } catch (error) {
        console.warn('Unable to access localStorage for anon user id:', error);
        return null;
    }
};

const setAnonUserId = (value) => {
    if (typeof window === 'undefined') return null;
    if (!isValidUuid(value)) return null;
    try {
        window.localStorage.setItem(ANON_USER_ID_KEY, value);
        return value;
    } catch (error) {
        console.warn('Unable to store anon user id:', error);
        return null;
    }
};

export const persistAnonUserId = (value) => setAnonUserId(value);

export const getOnboardingGateCourseId = () => {
    if (typeof window === 'undefined') return null;
    try {
        const stored = window.localStorage.getItem(ONBOARDING_GATE_COURSE_KEY);
        return isValidUuid(stored) ? stored : null;
    } catch (error) {
        console.warn('Unable to read onboarding gate course id:', error);
        return null;
    }
};

export const setOnboardingGateCourseId = (value) => {
    if (typeof window === 'undefined') return null;
    if (!isValidUuid(value)) return null;
    try {
        window.localStorage.setItem(ONBOARDING_GATE_COURSE_KEY, value);
        document.cookie = `${ONBOARDING_GATE_COURSE_KEY}=${value}; path=/; max-age=900; samesite=lax`;
        return value;
    } catch (error) {
        console.warn('Unable to store onboarding gate course id:', error);
        return null;
    }
};

export const clearOnboardingGateCourseId = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(ONBOARDING_GATE_COURSE_KEY);
        document.cookie = `${ONBOARDING_GATE_COURSE_KEY}=; path=/; max-age=0; samesite=lax`;
    } catch (error) {
        console.warn('Unable to clear onboarding gate course id:', error);
    }
};

const clearAnonUserId = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(ANON_USER_ID_KEY);
    } catch (error) {
        console.warn('Unable to clear anon user id:', error);
    }
};

export const clearOnboardingSession = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(ONBOARDING_SESSION_KEY);
    } catch (error) {
        console.warn('Unable to clear onboarding session:', error);
    }
};

export const getOnboardingSession = () => {
    if (typeof window === 'undefined') return null;
    try {
        const stored = window.localStorage.getItem(ONBOARDING_SESSION_KEY);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
        console.warn('Unable to read onboarding session:', error);
        return null;
    }
};

export const setOnboardingSession = (payload) => {
    if (typeof window === 'undefined') return null;
    try {
        window.localStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify(payload || {}));
        return payload;
    } catch (error) {
        console.warn('Unable to persist onboarding session:', error);
        return null;
    }
};

export const getAnonUserId = () => {
    const existing = readAnonUserId();
    if (existing) return existing;
    const created = generateUuid();
    return setAnonUserId(created) || created;
};

export const ensureAnonUserId = async () => {
    if (typeof window === 'undefined') {
        return readAnonUserId();
    }

    const existing = readAnonUserId();

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionUser = session?.user || null;
        if (sessionUser?.id) {
            if (sessionUser.is_anonymous) {
                if (sessionUser.id !== existing) {
                    setAnonUserId(sessionUser.id);
                }
            }
            return sessionUser.id;
        }
    } catch (error) {
        console.warn('Unable to read Supabase session for anon id:', error);
    }

    try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error && data?.user?.id) {
            setAnonUserId(data.user.id);
            return data.user.id;
        }
        if (error) {
            console.warn('Supabase anonymous sign-in failed:', error.message || error);
        }
    } catch (error) {
        console.warn('Supabase anonymous sign-in failed:', error);
    }

    if (existing) return existing;
    const created = generateUuid();
    return setAnonUserId(created) || created;
};

const LIMIT_REACHED_CODE = 'ONBOARDING_LIMIT_REACHED';
const DEFAULT_LIMIT_MESSAGE =
  'You have hit the limit on the number of attempts you can use this feature.';

const buildOnboardingError = (response, body, fallbackMessage) => {
    const message = body?.message || body?.error || fallbackMessage;
    const error = new Error(message);
    error.status = response.status;
    error.code = body?.code || null;
    error.limitType = body?.limitType || body?.limit_type || null;
    error.limit = body?.limit ?? null;
    error.remaining = body?.remaining ?? null;
    if (response.status === 429 && (body?.code === LIMIT_REACHED_CODE || body?.limitType)) {
        error.limitReached = true;
        if (!body?.message) {
            error.message = DEFAULT_LIMIT_MESSAGE;
        }
    }
    return error;
};

const TOPICS_POLL_DELAYS_MS = [1000, 1500, 2000, 2500, 3000, 4000];
const COURSE_POLL_DELAYS_MS = [1000, 1500, 2000, 3000, 4000, 5000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveAnonUserIdFromStatus = (body, currentAnonUserId) => {
    const responseAnonUserId =
        body?.anonUserId ||
        body?.anon_user_id ||
        body?.resolvedAnonUserId ||
        body?.resolved_anon_user_id ||
        null;
    if (responseAnonUserId && responseAnonUserId !== currentAnonUserId) {
        return persistAnonUserId(responseAnonUserId) || responseAnonUserId;
    }
    return currentAnonUserId;
};

const fetchAnonTopicsStatus = async (jobId, anonUserId) => {
    const statusUrl = `${API_PREFIX}/anon-topics/${encodeURIComponent(jobId)}?anonUserId=${encodeURIComponent(anonUserId)}`;
    const res = await fetch(statusUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw buildOnboardingError(res, body, 'Failed to fetch topic progress');
    const nextAnonUserId = resolveAnonUserIdFromStatus(body, anonUserId);
    return { body, anonUserId: nextAnonUserId };
};

const fetchAnonCourseStatus = async (jobId, anonUserId) => {
    const statusUrl = `${API_PREFIX}/anon-course-status/${encodeURIComponent(jobId)}?anonUserId=${encodeURIComponent(anonUserId)}`;
    const res = await fetch(statusUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw buildOnboardingError(res, body, 'Failed to fetch course progress');
    const nextAnonUserId = resolveAnonUserIdFromStatus(body, anonUserId);
    return { body, anonUserId: nextAnonUserId };
};

const MAX_POLL_ERRORS = 5;

const shouldBailOnStatusError = (error, attempts) => {
    const status = Number.isFinite(error?.status) ? error.status : null;
    if (status && [401, 403, 404].includes(status)) {
        return attempts >= 2;
    }
    return attempts >= MAX_POLL_ERRORS;
};

const pollAnonTopicsJob = async (jobId, anonUserId, { onProgress } = {}) => {
    let attempt = 0;
    let errorStreak = 0;
    let currentAnonUserId = anonUserId;
    while (true) {
        let body;
        try {
            const result = await fetchAnonTopicsStatus(jobId, currentAnonUserId);
            body = result.body;
            currentAnonUserId = result.anonUserId;
            errorStreak = 0;
        } catch (error) {
            errorStreak += 1;
            if (shouldBailOnStatusError(error, errorStreak)) {
                throw error;
            }
            const delay = TOPICS_POLL_DELAYS_MS[Math.min(attempt, TOPICS_POLL_DELAYS_MS.length - 1)];
            attempt += 1;
            await sleep(delay);
            continue;
        }

        const progress = typeof body?.progress === 'number' ? body.progress : null;
        if (typeof onProgress === 'function') {
            const message = body?.message || null;
            if (progress !== null || message) {
                onProgress(progress, message);
            }
        }

        const status = typeof body?.status === 'string' ? body.status.toLowerCase() : '';
        if (status === 'completed') {
            return body.result || body;
        }
        if (status === 'failed') {
            const message = body.error?.message || body.error || 'Topic generation failed';
            throw new Error(message);
        }

        const delay = TOPICS_POLL_DELAYS_MS[Math.min(attempt, TOPICS_POLL_DELAYS_MS.length - 1)];
        attempt += 1;
        await sleep(delay);
    }
};

export async function resumeAnonTopicsJob(jobId, anonUserId, options = {}) {
    if (!jobId) {
        throw new Error('jobId is required to resume topic generation');
    }
    const resolvedAnonUserId = anonUserId || await ensureAnonUserId();
    return waitForRealtimeJob(jobId, resolvedAnonUserId, {
        onProgress: options?.onProgress,
        checkStatusOnce: async () => {
            const { body } = await fetchAnonTopicsStatus(jobId, resolvedAnonUserId);
            return body;
        },
        fallback: () => pollAnonTopicsJob(jobId, resolvedAnonUserId, { onProgress: options?.onProgress }),
    });
}

const pollAnonCourseJob = async (jobId, anonUserId, { onProgress } = {}) => {
    let attempt = 0;
    let errorStreak = 0;
    let currentAnonUserId = anonUserId;
    while (true) {
        let body;
        try {
            const result = await fetchAnonCourseStatus(jobId, currentAnonUserId);
            body = result.body;
            currentAnonUserId = result.anonUserId;
            errorStreak = 0;
        } catch (error) {
            errorStreak += 1;
            if (shouldBailOnStatusError(error, errorStreak)) {
                throw error;
            }
            const delay = COURSE_POLL_DELAYS_MS[Math.min(attempt, COURSE_POLL_DELAYS_MS.length - 1)];
            attempt += 1;
            await sleep(delay);
            continue;
        }

        const progress = typeof body?.progress === 'number' ? body.progress : null;
        if (typeof onProgress === 'function') {
            const meta = {
                modulesComplete: body?.modulesComplete ?? null,
                totalModules: body?.totalModules ?? null,
                courseId: body?.courseId || null,
            };
            const message = body?.message || null;
            if (progress !== null || message || meta.courseId || Number.isFinite(meta.modulesComplete) || Number.isFinite(meta.totalModules)) {
                onProgress(progress, message, meta);
            }
        }

        const status = typeof body?.status === 'string' ? body.status.toLowerCase() : '';
        if (status === 'completed') {
            return body.result || body;
        }
        if (status === 'failed') {
            const message = body.error?.message || body.error || 'Course generation failed';
            throw new Error(message);
        }

        const delay = COURSE_POLL_DELAYS_MS[Math.min(attempt, COURSE_POLL_DELAYS_MS.length - 1)];
        attempt += 1;
        await sleep(delay);
    }
};

export async function resumeAnonCourseJob(jobId, anonUserId, options = {}) {
    if (!jobId) {
        throw new Error('jobId is required to resume course generation');
    }
    const resolvedAnonUserId = anonUserId || await ensureAnonUserId();
    return waitForRealtimeJob(jobId, resolvedAnonUserId, {
        onProgress: options?.onProgress,
        meta: options?.meta || {},
        checkStatusOnce: async () => {
            const { body } = await fetchAnonCourseStatus(jobId, resolvedAnonUserId);
            return body;
        },
        fallback: () => pollAnonCourseJob(jobId, resolvedAnonUserId, { onProgress: options?.onProgress }),
    });
}

const isRealtimeAvailable = () =>
    typeof window !== 'undefined' && supabase && typeof supabase.channel === 'function';

const waitForRealtimeJob = async (jobId, anonUserId, {
    onProgress,
    fallback,
    checkStatusOnce,
    meta = {},
    statusIntervalMs = 5000,
    idleThresholdMs,
} = {}) => {
    if (!jobId || !anonUserId || !isRealtimeAvailable()) {
        if (typeof fallback === 'function') {
            return fallback();
        }
        throw new Error('Realtime subscriptions unavailable for job updates');
    }

    return new Promise((resolve, reject) => {
        let settled = false;
        let channel = null;
        let statusCheckTimer = null;
        let statusInterval = null;
        const intervalMs = Number.isFinite(statusIntervalMs) ? Math.max(2000, statusIntervalMs) : 5000;
        const idleMs = Number.isFinite(idleThresholdMs) ? Math.max(2000, idleThresholdMs) : intervalMs;
        let lastActivityAt = Date.now();

        const cleanup = () => {
            if (statusCheckTimer) {
                clearTimeout(statusCheckTimer);
                statusCheckTimer = null;
            }
            if (statusInterval) {
                clearInterval(statusInterval);
                statusInterval = null;
            }
            if (channel) {
                supabase.removeChannel(channel);
                channel = null;
            }
        };

        const finalizeWith = (promise) => {
            if (settled) return;
            settled = true;
            cleanup();
            Promise.resolve(promise).then(resolve).catch(reject);
        };

        const emitProgress = (payload = {}) => {
            if (typeof onProgress !== 'function') return;
            const progress = typeof payload.progress === 'number' ? payload.progress : null;
            const message =
                typeof payload.message === 'string'
                    ? payload.message
                    : typeof payload.progressMessage === 'string'
                        ? payload.progressMessage
                        : null;
            const nextMeta = {
                courseId: payload.courseId || meta.courseId || null,
                modulesComplete: Number.isFinite(payload.modulesComplete) ? payload.modulesComplete : (meta.modulesComplete ?? null),
                totalModules: Number.isFinite(payload.totalModules) ? payload.totalModules : (meta.totalModules ?? null),
            };
            if (progress !== null || message || nextMeta.courseId || nextMeta.modulesComplete !== null || nextMeta.totalModules !== null) {
                lastActivityAt = Date.now();
                onProgress(progress, message, nextMeta);
            }
        };

        const handleJobUpdate = (payload) => {
            if (!payload || payload.jobId !== jobId) return;
            lastActivityAt = Date.now();
            emitProgress(payload);
            const status = typeof payload.status === 'string' ? payload.status.toLowerCase() : '';
            if (status === 'completed') {
                finalizeWith(payload.result || payload);
                return;
            }
            if (status === 'failed') {
                const message = payload.error?.message || payload.error || 'Job failed';
                finalizeWith(Promise.reject(new Error(message)));
            }
        };

        const handleJobProgress = (payload) => {
            if (!payload || payload.jobId !== jobId) return;
            lastActivityAt = Date.now();
            emitProgress(payload);
        };

        const runStatusCheck = async () => {
            if (typeof checkStatusOnce !== 'function') return;
            try {
                const statusPayload = await checkStatusOnce();
                if (settled || !statusPayload) return;
                emitProgress(statusPayload);
                const status = typeof statusPayload.status === 'string'
                    ? statusPayload.status.toLowerCase()
                    : '';
                if (status === 'completed') {
                    finalizeWith(statusPayload.result || statusPayload);
                    return;
                }
                if (status === 'failed') {
                    const message = statusPayload.error?.message || statusPayload.error || 'Job failed';
                    finalizeWith(Promise.reject(new Error(message)));
                }
            } catch (error) {
                // Ignore status check errors and continue listening to realtime updates
            }
        };

        channel = supabase
            .channel(`user:${anonUserId}:jobs`)
            .on('broadcast', { event: 'job_update' }, ({ payload }) => handleJobUpdate(payload))
            .on('broadcast', { event: 'job_progress' }, ({ payload }) => handleJobProgress(payload))
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    statusCheckTimer = setTimeout(runStatusCheck, 2000);
                    statusInterval = setInterval(() => {
                        if (settled) return;
                        const idleFor = Date.now() - lastActivityAt;
                        if (idleFor >= idleMs) {
                            runStatusCheck();
                        }
                    }, intervalMs);
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    if (typeof fallback === 'function') {
                        finalizeWith(fallback());
                    } else {
                        finalizeWith(Promise.reject(new Error('Realtime subscription failed')));
                    }
                }
            });
    });
};

export async function startNewOnboardingSession() {
    clearOnboardingSession();
    const previousId = readAnonUserId();
    let nextId = generateUuid();
    if (previousId && nextId === previousId) {
        nextId = generateUuid();
    }
    setAnonUserId(nextId);
    return { anonUserId: nextId, previousId };
}

/**
 * Generate the next onboarding chat message.
 * @param {Object} payload - { mode, messages, task }
 * @returns {Promise<{ success: boolean, reply: string, convinced?: boolean, needsSearch?: boolean }>}
 */
export async function getChatStep(payload) {
    try {
        const anonUserId = await ensureAnonUserId();
        const nextPayload = anonUserId ? { ...payload, anonUserId } : payload;
        const res = await fetch(`${API_PREFIX}/chat-step`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nextPayload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw buildOnboardingError(res, body, 'Chat step failed');
        return body;
    } catch (error) {
        console.error('getChatStep error:', error);
        throw error;
    }
}

export async function confirmNegotiationPrice(price) {
    try {
        const res = await authFetch(`${API_PREFIX}/confirm-price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw buildOnboardingError(res, body, 'Confirm price failed');
        return body;
    } catch (error) {
        console.error('confirmNegotiationPrice error:', error);
        throw error;
    }
}

export async function getNegotiationStatus() {
    try {
        const res = await authFetch(`${API_PREFIX}/negotiation-status`, {
            method: 'GET',
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            if (res.status === 401 || res.status === 404) {
                return null;
            }
            throw buildOnboardingError(res, body, 'Negotiation status failed');
        }
        return body;
    } catch (error) {
        console.warn('getNegotiationStatus error:', error);
        return null;
    }
}

export async function syncNegotiationState(payload) {
    try {
        const res = await authFetch(`${API_PREFIX}/negotiation-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {}),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw buildOnboardingError(res, body, 'Failed to sync negotiation');
        return body;
    } catch (error) {
        console.error('syncNegotiationState error:', error);
        throw error;
    }
}

export async function startNegotiationTrial(payload) {
    try {
        const res = await authFetch(`${API_PREFIX}/start-trial`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {}),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw buildOnboardingError(res, body, 'Failed to start trial');
        return body;
    } catch (error) {
        console.error('startNegotiationTrial error:', error);
        throw error;
    }
}

export async function continueWithFreePlan() {
    try {
        const res = await authFetch(`${API_PREFIX}/continue-free`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw buildOnboardingError(res, body, 'Failed to continue on free plan');
        return body;
    } catch (error) {
        console.error('continueWithFreePlan error:', error);
        throw error;
    }
}

export async function generateAnonTopics(anonUserId, courseName, university, options = {}) {
    try {
        const resolvedAnonUserId = anonUserId || await ensureAnonUserId();
        const { onProgress, onJobId, ...restOptions } = options || {};
        const payload = {
            anonUserId: resolvedAnonUserId,
            courseName,
            university,
            ...restOptions,
        };
        const res = await authFetch(`${API_PREFIX}/anon-topics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw buildOnboardingError(res, body, 'Failed to generate anon topics');
        const responseAnonUserId =
            body.anonUserId ||
            body.anon_user_id ||
            body.resolvedAnonUserId ||
            body.resolved_anon_user_id ||
            null;
        const effectiveAnonUserId =
            responseAnonUserId && responseAnonUserId !== resolvedAnonUserId
                ? (persistAnonUserId(responseAnonUserId) || responseAnonUserId)
                : resolvedAnonUserId;
        const jobId =
            body.jobId ||
            body.job_id ||
            body.job?.id ||
            body.data?.jobId ||
            body.data?.job_id ||
            null;

        if (res.status === 202 || jobId) {
            if (typeof onJobId === 'function' && jobId) {
                onJobId(jobId);
            }
            if (typeof onProgress === 'function') {
                onProgress(0, null);
            }
            return await waitForRealtimeJob(jobId, effectiveAnonUserId, {
                onProgress,
                checkStatusOnce: async () => {
                    const { body } = await fetchAnonTopicsStatus(jobId, effectiveAnonUserId);
                    return body;
                },
                fallback: () => pollAnonTopicsJob(jobId, effectiveAnonUserId, { onProgress }),
            });
        }

        if (typeof onProgress === 'function') {
            onProgress(100, null);
        }
        return body;
    } catch (error) {
        console.error('generateAnonTopics error:', error);
        throw error;
    }
}

export async function generateAnonCourse(params = {}) {
    try {
        const {
            anonUserId,
            onProgress,
            onJobId,
            ...rest
        } = params || {};
        const resolvedAnonUserId = anonUserId || await ensureAnonUserId();
        const payload = {
            anonUserId: resolvedAnonUserId,
            ...rest,
        };
        const res = await authFetch(`${API_PREFIX}/anon-course-create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw buildOnboardingError(res, body, 'Failed to generate anon course');

        // If the backend returned a session, set it so the user can authenticate
        if (body.session?.access_token && body.session?.refresh_token) {
            try {
                await supabase.auth.setSession({
                    access_token: body.session.access_token,
                    refresh_token: body.session.refresh_token,
                });
            } catch (sessionErr) {
                console.warn('[onboarding] Failed to set anonymous session:', sessionErr);
            }
        }

        const jobId =
            body.jobId ||
            body.job_id ||
            body.job?.id ||
            body.data?.jobId ||
            body.data?.job_id ||
            null;
        const responseAnonUserId =
            body.anonUserId ||
            body.anon_user_id ||
            body.resolvedAnonUserId ||
            body.resolved_anon_user_id ||
            null;
        const effectiveAnonUserId =
            responseAnonUserId && responseAnonUserId !== resolvedAnonUserId
                ? (persistAnonUserId(responseAnonUserId) || responseAnonUserId)
                : resolvedAnonUserId;
        const courseId =
            body.courseId ||
            body.course_id ||
            body.course?.course_id ||
            body.course?.id ||
            null;

        if (res.status === 202 || jobId) {
            if (typeof onJobId === 'function' && jobId) {
                onJobId(jobId);
            }
            if (typeof onProgress === 'function') {
                onProgress(0, null, { courseId });
            }
            const result = await waitForRealtimeJob(jobId, effectiveAnonUserId, {
                onProgress,
                meta: { courseId },
                checkStatusOnce: async () => {
                    const { body } = await fetchAnonCourseStatus(jobId, effectiveAnonUserId);
                    return body;
                },
                fallback: () => pollAnonCourseJob(jobId, effectiveAnonUserId, { onProgress }),
            });
            return { ...result, courseId: result?.courseId || courseId };
        }

        if (typeof onProgress === 'function') {
            onProgress(100, null, { courseId });
        }
        return { ...body, courseId };
    } catch (error) {
        console.error('generateAnonCourse error:', error);
        throw error;
    }
}

export async function transferAnonData(anonUserId) {
    try {
        const resolvedAnonUserId = anonUserId || readAnonUserId();
        if (!resolvedAnonUserId) return null;

        const res = await authFetch(`${API_PREFIX}/transfer-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anonUserId: resolvedAnonUserId }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            if (res.status === 404) return null;
            throw buildOnboardingError(res, body, 'Failed to transfer anon data');
        }

        clearAnonUserId();
        return body;
    } catch (error) {
        console.error('transferAnonData error:', error);
        throw error;
    }
}

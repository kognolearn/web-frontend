/**
 * API client for onboarding flow.
 */

import { authFetch } from "@/lib/api";

const backendBaseUrl = (process.env.NEXT_PUBLIC_BACKEND_API_URL || '').replace(/\/$/, '');
const API_PREFIX = backendBaseUrl ? `${backendBaseUrl}/onboarding` : '/api/onboarding';
const ANON_USER_ID_KEY = 'kogno_anon_user_id';
const ONBOARDING_SESSION_KEY = 'kogno_onboarding_session_v1';

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

const clearAnonUserId = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(ANON_USER_ID_KEY);
    } catch (error) {
        console.warn('Unable to clear anon user id:', error);
    }
};

const clearOnboardingSession = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(ONBOARDING_SESSION_KEY);
    } catch (error) {
        console.warn('Unable to clear onboarding session:', error);
    }
};

export const getAnonUserId = () => {
    const existing = readAnonUserId();
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

const pollAnonTopicsJob = async (jobId, anonUserId, { onProgress } = {}) => {
    let attempt = 0;
    while (true) {
        const statusUrl = `${API_PREFIX}/anon-topics/${encodeURIComponent(jobId)}?anonUserId=${encodeURIComponent(anonUserId)}`;
        const res = await fetch(statusUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw buildOnboardingError(res, body, 'Failed to fetch topic progress');

        const progress = typeof body.progress === 'number' ? body.progress : null;
        if (typeof onProgress === 'function' && progress !== null) {
            onProgress(progress, body.message || null);
        }

        const status = typeof body.status === 'string' ? body.status.toLowerCase() : '';
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

const pollAnonCourseJob = async (jobId, anonUserId, { onProgress } = {}) => {
    let attempt = 0;
    while (true) {
        const statusUrl = `${API_PREFIX}/anon-course-status/${encodeURIComponent(jobId)}?anonUserId=${encodeURIComponent(anonUserId)}`;
        const res = await fetch(statusUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw buildOnboardingError(res, body, 'Failed to fetch course progress');

        const progress = typeof body.progress === 'number' ? body.progress : null;
        if (typeof onProgress === 'function' && progress !== null) {
            onProgress(progress, body.message || null, {
                modulesComplete: body.modulesComplete ?? null,
                totalModules: body.totalModules ?? null,
                courseId: body.courseId || null,
            });
        }

        const status = typeof body.status === 'string' ? body.status.toLowerCase() : '';
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
        const anonUserId = getAnonUserId();
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
        const resolvedAnonUserId = anonUserId || getAnonUserId();
        const { onProgress, ...restOptions } = options || {};
        const payload = {
            anonUserId: resolvedAnonUserId,
            courseName,
            university,
            ...restOptions,
        };
        const res = await fetch(`${API_PREFIX}/anon-topics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw buildOnboardingError(res, body, 'Failed to generate anon topics');
        const jobId =
            body.jobId ||
            body.job_id ||
            body.job?.id ||
            body.data?.jobId ||
            body.data?.job_id ||
            null;

        if (res.status === 202 || jobId) {
            if (typeof onProgress === 'function') {
                onProgress(0, null);
            }
            return await pollAnonTopicsJob(jobId, resolvedAnonUserId, { onProgress });
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
            ...rest
        } = params || {};
        const resolvedAnonUserId = anonUserId || getAnonUserId();
        const payload = {
            anonUserId: resolvedAnonUserId,
            ...rest,
        };
        const res = await fetch(`${API_PREFIX}/anon-course-create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw buildOnboardingError(res, body, 'Failed to generate anon course');

        const jobId =
            body.jobId ||
            body.job_id ||
            body.job?.id ||
            body.data?.jobId ||
            body.data?.job_id ||
            null;
        const courseId =
            body.courseId ||
            body.course_id ||
            body.course?.course_id ||
            body.course?.id ||
            null;

        if (res.status === 202 || jobId) {
            if (typeof onProgress === 'function') {
                onProgress(0, null, { courseId });
            }
            const result = await pollAnonCourseJob(jobId, resolvedAnonUserId, { onProgress });
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

/**
 * API client for onboarding flow.
 */

const backendBaseUrl = (process.env.BACKEND_API_URL || '').replace(/\/$/, '');
const API_PREFIX = backendBaseUrl ? `${backendBaseUrl}/onboarding` : '/api/onboarding';
const SHOULD_USE_MOCKS = (
    process.env.ONBOARDING_USE_MOCKS ??
    (process.env.NODE_ENV === 'development' ? 'true' : 'false')
) === 'true';
const ANON_USER_ID_KEY = 'kogno_anon_user_id';

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

const getAnonUserId = () => {
    const existing = readAnonUserId();
    if (existing) return existing;
    const created = generateUuid();
    return setAnonUserId(created) || created;
};

export async function startNewOnboardingSession() {
    const previousId = readAnonUserId();
    let nextId = generateUuid();
    if (previousId && nextId === previousId) {
        nextId = generateUuid();
    }
    setAnonUserId(nextId);
    if (previousId && previousId !== nextId) {
        try {
            await cleanupAnonUser(previousId, { clearLocalStorage: false });
        } catch (error) {}
    }
    return { anonUserId: nextId, previousId };
}

const buildMockStatus = (jobId) => {
    const now = Date.now();
    const nodes = [
        {
            id: `mock-node-${jobId || now}`,
            title: 'Limits and Continuity',
            data: {
                reading: `# Limits and Continuity\n\n## Key idea\nA limit describes the value a function approaches as the input approaches some point.\n\n### Quick example\nIf \\(f(x) = 2x\\), then \\(\\lim_{x \\to 3} f(x) = 6\\).`,
                quiz: [
                    {
                        question: 'What does \\(\\lim_{x \\to a} f(x)\\) represent?',
                        options: [
                            'The exact value of f(a)',
                            'The value f(x) approaches as x approaches a',
                            'The derivative of f at a',
                            'The integral of f from 0 to a'
                        ],
                        correct_index: 1,
                        explanation: 'A limit describes the value the function approaches near a point.'
                    }
                ],
                flashcards: [
                    ['What is a limit?', 'The value a function approaches as x approaches a point.', 'Limits describe behavior near a point.']
                ],
                video: [
                    {
                        videoId: 'dQw4w9WgXcQ',
                        title: 'Limits: Intuition in 3 Minutes',
                        summary: 'A quick intuition for how limits work.'
                    }
                ],
                content_sequence: ['reading', 'video', 'quiz', 'flashcards']
            }
        }
    ];

    return {
        status: 'completed',
        courseId: `mock-course-${jobId}`,
        lessonId: nodes[0].id,
        nodes,
        courseContext: { title: 'Calculus I', college: 'Demo University' }
    };
};

/**
 * Validate the course and college.
 * @param {Object} data - { collegeName, courseName }
 * @returns {Promise<{ valid: boolean, message?: string }>}
 */
export async function validateCourse(data) {
  try {
    const res = await fetch(`${API_PREFIX}/validate-course`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Validation failed');
    return await res.json();
  } catch (error) {
    console.error('validateCourse error:', error);
    // Fallback for demo/dev if API is not ready
        if (SHOULD_USE_MOCKS) {
       return { valid: true };
    }
    throw error;
  }
}

/**
 * Get hard topics for a course.
 * @param {Object} data - { collegeName, courseName }
 * @returns {Promise<{ topics: string[] }>}
 */
export async function getHardTopics(data) {
    try {
        const params = new URLSearchParams(data);
        const res = await fetch(`${API_PREFIX}/hard-topics?${params}`, {
            method: 'GET',
        });
        if (!res.ok) throw new Error('Failed to fetch topics');
        return await res.json();
    } catch (error) {
        console.error('getHardTopics error:', error);
        if (SHOULD_USE_MOCKS) {
             return { topics: ['Midterm Review', 'Finals Prep', 'Complex Analysis', 'Vector Calculus', 'Linear Algebra'] };
        }
        throw error;
    }
}

/**
 * Validate a topic.
 * @param {Object} data - { collegeName, courseName, topic }
 * @returns {Promise<{ valid: boolean, message?: string }>}
 */
export async function validateTopic(data) {
    try {
        const res = await fetch(`${API_PREFIX}/validate-topic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Topic validation failed');
        return await res.json();
    } catch (error) {
        console.error('validateTopic error:', error);
        if (SHOULD_USE_MOCKS) {
            return { valid: true };
        }
        throw error;
    }
}

/**
 * Generate a lesson.
 * @param {Object} data - { collegeName, courseName, topic }
 * @returns {Promise<{ jobId: string }>}
 */
export async function generateLesson(data) {
    try {
        const anonUserId = getAnonUserId();
        const payload = anonUserId ? { ...data, anonUserId } : data;
        const res = await fetch(`${API_PREFIX}/generate-lesson`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Generation failed');
        const response = await res.json();
        if (isValidUuid(response?.anonUserId)) {
            setAnonUserId(response.anonUserId);
        }
        return response;
    } catch (error) {
        console.error('generateLesson error:', error);
        if (SHOULD_USE_MOCKS) {
            return { jobId: 'mock-job-' + Date.now() };
        }
        throw error;
    }
}

export async function cleanupAnonUser(anonUserId, options = {}) {
    const resolvedId = isValidUuid(anonUserId) ? anonUserId : readAnonUserId();
    const clearLocalStorage = options?.clearLocalStorage !== false;
    if (!resolvedId) return { ok: false, skipped: true };
    try {
        await fetch(`${API_PREFIX}/cleanup-anon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anonUserId: resolvedId }),
        });
        return { ok: true };
    } catch (error) {
        console.error('cleanupAnonUser error:', error);
        return { ok: false, error };
    } finally {
        if (clearLocalStorage) {
            clearAnonUserId();
        }
    }
}

/**
 * Get lesson generation status.
 * @param {string} jobId
 * @returns {Promise<{ status: 'pending' | 'completed' | 'failed', resultUrl?: string }>}
 */
export async function getLessonStatus(jobId) {
    try {
        const res = await fetch(`${API_PREFIX}/lesson-status?jobId=${jobId}`, {
            method: 'GET',
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-store' },
        });
        if (!res.ok) throw new Error('Status check failed');
        const data = await res.json();
        if (!data.resultUrl && data.redirectUrl) {
            data.resultUrl = data.redirectUrl;
        }
        return data;
    } catch (error) {
        console.error('getLessonStatus error:', error);
        if (SHOULD_USE_MOCKS) {
            // Mock completion after a few seconds
            const timestamp = Number(jobId.split('-').pop());
            const elapsed = Number.isFinite(timestamp) ? Date.now() - timestamp : 0;
            if (elapsed > 5000) {
                return buildMockStatus(jobId);
            }
            return { status: 'pending' };
        }
        throw error;
    }
}

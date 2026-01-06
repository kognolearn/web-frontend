/**
 * API client for onboarding flow.
 */

const backendBaseUrl = (process.env.BACKEND_API_URL || '').replace(/\/$/, '');
const API_PREFIX = backendBaseUrl ? `${backendBaseUrl}/onboarding` : '/api/onboarding';
const SHOULD_USE_MOCKS = (
    process.env.ONBOARDING_USE_MOCKS ??
    (process.env.NODE_ENV === 'development' ? 'true' : 'false')
) === 'true';

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
        const res = await fetch(`${API_PREFIX}/generate-lesson`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Generation failed');
        return await res.json();
    } catch (error) {
        console.error('generateLesson error:', error);
        if (SHOULD_USE_MOCKS) {
            return { jobId: 'mock-job-' + Date.now() };
        }
        throw error;
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
        });
        if (!res.ok) throw new Error('Status check failed');
        return await res.json();
    } catch (error) {
        console.error('getLessonStatus error:', error);
        if (SHOULD_USE_MOCKS) {
            // Mock completion after a few seconds
            const timestamp = Number(jobId.split('-').pop());
            const elapsed = Number.isFinite(timestamp) ? Date.now() - timestamp : 0;
            if (elapsed > 5000) {
                return { status: 'completed', resultUrl: '/courses/demo-course' };
            }
            return { status: 'pending' };
        }
        throw error;
    }
}

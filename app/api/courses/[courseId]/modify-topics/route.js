import { NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://api.kognolearn.com';

export async function POST(request, { params }) {
  try {
    const { courseId } = await params;
    const body = await request.json();
    
    const { userId, prompt, lessonIds, currentModules } = body;

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    // Build the backend API URL - targeting a new endpoint for topic modification
    const backendUrl = `${BACKEND_API_URL}/courses/${courseId}/modify-topics`;

    // Build request body
    const requestBody = {
      userId,
      prompt,
      currentModules: currentModules || [],
    };

    // Include lessonIds if provided (specific topics to change)
    if (lessonIds && Array.isArray(lessonIds) && lessonIds.length > 0) {
      requestBody.lessonIds = lessonIds;
    }

    // Forward the request to the backend API
    // The backend should return a job ID (202 status) for async processing
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30 * 1000); // 30 seconds for job creation

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(request.headers.get('authorization') && {
            'Authorization': request.headers.get('authorization')
          }),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const bodyText = await response.text();
      let data;
      try {
        data = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        data = { error: 'Invalid JSON from backend', raw: bodyText };
      }

      // Return the backend response as-is (preserving status code)
      // If backend returns 202 with jobId, frontend will poll via resolveAsyncJobResponse
      return NextResponse.json(data, { status: response.status });
    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    console.error('Error in /api/courses/[courseId]/modify-topics:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

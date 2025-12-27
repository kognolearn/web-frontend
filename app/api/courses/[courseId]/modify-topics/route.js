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

    // Forward the request to the backend API with extended timeout (30 minutes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30 * 60 * 1000);
    
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
    
    clearTimeout(timeoutId);

    // Check if the backend request was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Backend API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    // Parse and return backend response
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Error in /api/courses/[courseId]/modify-topics:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

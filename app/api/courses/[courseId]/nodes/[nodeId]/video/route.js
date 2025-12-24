import { NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://api.kognolearn.com';

/**
 * PATCH /api/courses/:courseId/nodes/:nodeId/video
 * Sets videoCompleted status for a user
 * Body: { userId, completed?: boolean }
 */
export async function PATCH(request, { params }) {
  try {
    const { courseId, nodeId } = await params;
    const body = await request.json();
    const { userId, completed = true } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const backendUrl = `${BACKEND_API_URL}/courses/${courseId}/nodes/${nodeId}/video`;

    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')
        }),
      },
      body: JSON.stringify({
        userId,
        completed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Backend API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in PATCH /api/courses/[courseId]/nodes/[nodeId]/video:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

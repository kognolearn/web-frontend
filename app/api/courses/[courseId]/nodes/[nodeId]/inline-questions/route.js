import { NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://api.kognolearn.com';

/**
 * GET /api/courses/:courseId/nodes/:nodeId/inline-questions
 * Returns inline question answers + readingCompleted status
 */
export async function GET(request, { params }) {
  try {
    const { courseId, nodeId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const backendUrl = `${BACKEND_API_URL}/courses/${courseId}/nodes/${nodeId}/inline-questions?userId=${userId}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')
        }),
      },
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
    console.error('Error in GET /api/courses/[courseId]/nodes/[nodeId]/inline-questions:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/courses/:courseId/nodes/:nodeId/inline-questions
 * Saves inline answers and updates readingCompleted
 * Body: { userId, updates: [{ questionIndex, selectedAnswer }] }
 */
export async function PATCH(request, { params }) {
  try {
    const { courseId, nodeId } = await params;
    const body = await request.json();
    const { userId, updates } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'updates is required' },
        { status: 400 }
      );
    }

    const backendUrl = `${BACKEND_API_URL}/courses/${courseId}/nodes/${nodeId}/inline-questions`;

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
        updates,
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
    console.error('Error in PATCH /api/courses/[courseId]/nodes/[nodeId]/inline-questions:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

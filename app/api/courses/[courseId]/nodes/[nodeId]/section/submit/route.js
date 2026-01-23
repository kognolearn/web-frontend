import { NextResponse } from 'next/server';

const NEXT_PUBLIC_BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://api.kognolearn.com';

/**
 * POST /api/courses/:courseId/nodes/:nodeId/section/submit
 *
 * Stores section answers without grading.
 */
export async function POST(request, { params }) {
  try {
    const { courseId, nodeId } = await params;
    const body = await request.json();

    const backendUrl = `${NEXT_PUBLIC_BACKEND_API_URL}/courses/${courseId}/nodes/${nodeId}/section/submit`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')
        }),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Section Submit API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

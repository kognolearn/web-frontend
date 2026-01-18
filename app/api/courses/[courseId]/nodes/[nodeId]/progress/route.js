import { NextResponse } from 'next/server';

const NEXT_PUBLIC_BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://api.kognolearn.com';

export async function PATCH(request, { params }) {
  try {
    const { courseId, nodeId } = await params;

    // Parse request body
    const body = await request.json();
    const { mastery_status, familiarity_score } = body;

    // Build the backend API URL
    const backendUrl = `${NEXT_PUBLIC_BACKEND_API_URL}/courses/${courseId}/nodes/${nodeId}/progress`;

    // Forward the request to the backend API
    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // Forward any authorization headers if needed
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')
        }),
      },
      body: JSON.stringify({
        ...(mastery_status && { mastery_status }),
        ...(familiarity_score !== undefined && { familiarity_score }),
      }),
    });

    // Check if the backend request was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Backend API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    // Parse and return the backend response
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/courses/[courseId]/nodes/[nodeId]/progress:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';

const NEXT_PUBLIC_BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://api.kognolearn.com';

/**
 * POST /api/courses/:courseId/nodes/:nodeId/grade
 *
 * Grade answers for a V2 section
 *
 * Request body:
 * {
 *   answers: { [componentId]: value },
 *   sectionId?: string,   // Optional: grade specific section only
 *   sync?: boolean        // Default: false. If true, returns result immediately
 * }
 *
 * Response (sync mode - 200):
 * {
 *   success: true,
 *   grade: {
 *     passed: boolean,
 *     total_points: number,
 *     earned_points: number,
 *     results: [{
 *       component_id: string,
 *       evaluator: string,
 *       passed: boolean,
 *       points: number,
 *       earned_points: number,
 *       details: { expected?, received?, feedback?, error? }
 *     }]
 *   },
 *   eventId: string
 * }
 *
 * Response (async mode - 202):
 * {
 *   success: true,
 *   jobId: string,
 *   status: "queued",
 *   statusUrl: string,
 *   message: string
 * }
 */
export async function POST(request, { params }) {
  try {
    const { courseId, nodeId } = await params;
    const body = await request.json();

    const { answers, sectionId, sync = false, grading_logic, taskKey, taskId, taskTitle } = body;

    // Validate required fields
    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { error: 'answers object is required' },
        { status: 400 }
      );
    }

    // Build the backend API URL
    const backendUrl = `${NEXT_PUBLIC_BACKEND_API_URL}/courses/${courseId}/nodes/${nodeId}/grade`;

    console.log(`[Grade API] Grading section ${sectionId || 'all'} for node ${nodeId} in course ${courseId}`);

    // Forward the request to the backend API
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')
        }),
      },
      body: JSON.stringify({
        answers,
        sectionId,
        sync,
        ...(grading_logic && { grading_logic }),
        ...(taskKey && { taskKey }),
        ...(taskId && { taskId }),
        ...(taskTitle && { taskTitle }),
      }),
    });

    // Check if the backend request was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Grade API] Backend error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Backend API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    // Parse and return the backend response
    const data = await response.json();

    // For async responses, return 202
    if (response.status === 202 || data.jobId) {
      return NextResponse.json(data, { status: 202 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Grade API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

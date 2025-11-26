import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { courseId } = params;
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const userId = searchParams.get('userId');

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 'hours' param removed: backend no longer expects this parameter

    // Build the backend API URL
    const backendUrl = new URL(`https://api.kognolearn.com/courses/${courseId}/plan`);
    backendUrl.searchParams.set('userId', userId);

    // Forward the request to the backend API
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward any authorization headers if needed
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')
        }),
      },
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

    // Parse backend response
    const data = await response.json();

    // Normalize to ensure everything is unlocked regardless of backend data
    const unlockPlan = (p) => {
      if (!p) return p;
      const modules = (p.modules || []).map((m) => ({
        ...m,
        lessons: (m.lessons || []).map((lesson) => ({ ...lesson, is_locked: false }))
      }));
      return { ...p, modules };
    };

    return NextResponse.json(unlockPlan(data));

  } catch (error) {
    console.error('Error in /api/courses/[courseId]/plan:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

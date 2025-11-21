import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const userId = searchParams.get('userId');
    const hours = searchParams.get('hours');

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!hours) {
      return NextResponse.json(
        { error: 'hours is required' },
        { status: 400 }
      );
    }

    // Build the backend API URL
    const backendUrl = new URL(`https://api.kognolearn.com/courses/${id}/plan`);
    backendUrl.searchParams.set('userId', userId);
    backendUrl.searchParams.set('hours', hours);

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

    // Parse and return the backend response
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/courses/[id]/plan:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

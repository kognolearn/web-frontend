import { NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://api.kognolearn.com';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const nodeId = searchParams.get('id'); // The lesson/node ID
    const courseId = searchParams.get('courseId');
    const userId = searchParams.get('userId');
    const format = searchParams.get('format'); // Legacy parameter, not used in new API

    // Validate required parameters
    if (!nodeId) {
      return NextResponse.json(
        { error: 'id (nodeId) is required' },
        { status: 400 }
      );
    }

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Build the backend API URL
    const backendUrl = new URL(`${BACKEND_API_URL}/courses/${courseId}/nodes/${nodeId}`);
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

    // Parse the backend response
    const backendData = await response.json();

    // Check if the response has the expected structure
    if (!backendData.success || !backendData.lesson) {
      return NextResponse.json(
        { error: 'Invalid response from backend' },
        { status: 500 }
      );
    }

    const lesson = backendData.lesson;
    const contentPayload = lesson.content_payload || {};

    // Transform the backend response to match the frontend's expected format
    // The frontend expects { format, data } where data contains the content
    const transformedResponse = {
      format: format || 'lesson', // Use provided format or default
      data: {
        // Lesson metadata
        id: lesson.id,
        title: lesson.title,
        module_ref: lesson.module_ref,
        estimated_minutes: lesson.estimated_minutes,
        bloom_level: lesson.bloom_level,
        
        // Content based on what's available
        body: contentPayload.reading || '',
        
        // Video data
        ...(contentPayload.video && {
          videos: [{
            url: contentPayload.video.videoId 
              ? `https://www.youtube.com/watch?v=${contentPayload.video.videoId}`
              : contentPayload.video.url || '',
            title: contentPayload.video.title || lesson.title,
            duration_min: lesson.estimated_minutes || 0,
            summary: contentPayload.video.description || '',
          }]
        }),
        
        // Flashcards
        ...(contentPayload.flashcards && contentPayload.flashcards.length > 0 && {
          cards: contentPayload.flashcards.map(card => [
            card.front || card.question || '',
            card.back || card.answer || '',
            card.explanation || '',
            card.difficulty || 'medium'
          ])
        }),
        
        // Quiz questions (both mini_quiz and practice_exam format)
        ...(contentPayload.quiz && contentPayload.quiz.length > 0 && {
          questions: contentPayload.quiz.map(q => {
            const resolvedCorrectIndex = Number.isInteger(q.correct_index)
              ? q.correct_index
              : Number.isInteger(q.correctIndex)
              ? q.correctIndex
              : null;
            const resolvedAnswer =
              q.correct_answer ??
              q.correctAnswer ??
              q.answer ??
              (resolvedCorrectIndex !== null && Array.isArray(q.options)
                ? q.options[resolvedCorrectIndex]
                : '');

            return {
              type: q.type || 'mcq',
              question: q.question || q.prompt || '',
              options: q.options || [],
              answer: resolvedAnswer,
              correctAnswer: resolvedAnswer,
              correctIndex: resolvedCorrectIndex,
              explanation: q.explanation || '',
              ...(q.type === 'frq' && {
                prompt: q.prompt || q.question,
                model_answer: q.model_answer || q.answer,
                rubric: q.rubric || ''
              })
            };
          }),
          // Also provide in exam format
          mcq: contentPayload.quiz
            .filter(q => !q.type || q.type === 'mcq')
            .map(q => {
              const resolvedCorrectIndex = Number.isInteger(q.correct_index)
                ? q.correct_index
                : Number.isInteger(q.correctIndex)
                ? q.correctIndex
                : null;
              const resolvedAnswer =
                q.correct_answer ??
                q.correctAnswer ??
                q.answer ??
                (resolvedCorrectIndex !== null && Array.isArray(q.options)
                  ? q.options[resolvedCorrectIndex]
                  : '');

              return {
                question: q.question || '',
                options: q.options || [],
                answer: resolvedAnswer,
                correctAnswer: resolvedAnswer,
                correctIndex: resolvedCorrectIndex,
                explanation: q.explanation || ''
              };
            }),
          frq: contentPayload.quiz
            .filter(q => q.type === 'frq')
            .map(q => ({
              prompt: q.prompt || q.question || '',
              model_answer: q.model_answer || q.answer || '',
              rubric: q.rubric || '',
              explanation: q.explanation || ''
            }))
        }),
      }
    };

    return NextResponse.json(transformedResponse);

  } catch (error) {
    console.error('Error in /api/content:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

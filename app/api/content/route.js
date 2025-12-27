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

    console.log(`[Content API] Request received - courseId: ${courseId}, nodeId: ${nodeId}, format: ${format}`);

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

    // Log raw backend response for quiz content debugging
    console.log('[Content API] Raw backend response:', JSON.stringify(backendData, null, 2));

    // Check if the response has the expected structure
    if (!backendData.success || !backendData.lesson) {
      return NextResponse.json(
        { error: 'Invalid response from backend' },
        { status: 500 }
      );
    }

    const lesson = backendData.lesson;
    const contentPayload = lesson.content_payload || {};

    // Log quiz data specifically if present
    if (contentPayload.quiz) {
      console.log('[Content API] Quiz data from backend:', JSON.stringify(contentPayload.quiz, null, 2));
    }

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
        
        // Completion status from backend (user_node_state)
        readingCompleted: lesson.readingCompleted || false,
        videoCompleted: lesson.videoCompleted || false,
        quizCompleted: lesson.quizCompleted || false,
        mastery_status: lesson.mastery_status || 'pending',
        familiarity_score: lesson.familiarity_score,
        
        // Inline question selections from backend
        inlineQuestionSelections: contentPayload.inlineQuestionSelections || {},
        
        // Content based on what's available
        body: contentPayload.reading || '',
        
        // Video data
        ...(Array.isArray(contentPayload.video) && contentPayload.video.length > 0 && {
          videos: contentPayload.video.map(v => ({
            url: v.videoId 
              ? `https://www.youtube.com/watch?v=${v.videoId}`
              : v.url || '',
            title: v.title || lesson.title,
            duration_min: lesson.estimated_minutes || 0,
            summary: v.description || '',
          }))
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
        
        // Quiz questions
        // Handle both single quiz object and array of quiz questions
        ...(contentPayload.quiz && (() => {
          // Normalize quiz to array format
          const quizArray = Array.isArray(contentPayload.quiz) 
            ? contentPayload.quiz 
            : [contentPayload.quiz];
          
          if (quizArray.length === 0) return {};
          
          const transformQuestion = (q) => {
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
              // Pass through the UUID from api.quiz_questions table
              ...(q.id && { id: q.id }),
              // Pass through the status (correct, incorrect, unattempted) from api.quiz_questions table
              ...(q.status && { status: q.status }),
              // Pass through the user's selected answer index from api.quiz_questions table
              ...(q.selectedAnswer !== undefined && q.selectedAnswer !== null && { selectedAnswer: q.selectedAnswer }),
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
          };

          return {
            questions: quizArray.map(transformQuestion),
            // Also provide in exam format
            mcq: quizArray
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
                  // Pass through the UUID from api.quiz_questions table
                  ...(q.id && { id: q.id }),
                  // Pass through the status (correct, incorrect, unattempted) from api.quiz_questions table
                  ...(q.status && { status: q.status }),
                  // Pass through the user's selected answer index from api.quiz_questions table
                  ...(q.selectedAnswer !== undefined && q.selectedAnswer !== null && { selectedAnswer: q.selectedAnswer }),
                  question: q.question || '',
                  options: q.options || [],
                  answer: resolvedAnswer,
                  correctAnswer: resolvedAnswer,
                  correctIndex: resolvedCorrectIndex,
                  explanation: q.explanation || ''
                };
              }),
            frq: quizArray
              .filter(q => q.type === 'frq')
              .map(q => ({
                // Pass through the UUID from api.quiz_questions table
                ...(q.id && { id: q.id }),
                // Pass through the status (correct, incorrect, unattempted) from api.quiz_questions table
                ...(q.status && { status: q.status }),
                // Pass through the user's selected answer index from api.quiz_questions table
                ...(q.selectedAnswer !== undefined && q.selectedAnswer !== null && { selectedAnswer: q.selectedAnswer }),
                prompt: q.prompt || q.question || '',
                model_answer: q.model_answer || q.answer || '',
                rubric: q.rubric || '',
                explanation: q.explanation || ''
              }))
          };
        })()),
        
        // Practice problems (exam-style problems with rubrics and solutions)
        ...(contentPayload.practice_problems && Array.isArray(contentPayload.practice_problems) && {
          practice_problems: contentPayload.practice_problems
        }),
        
        // Interactive practice (parsons, skeleton, matching, blackbox problems)
        ...(contentPayload.interactive_practice && {
          interactive_practice: contentPayload.interactive_practice
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

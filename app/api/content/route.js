import { NextResponse } from 'next/server';

const NEXT_PUBLIC_BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://api.kognolearn.com';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const nodeId = searchParams.get('id'); // The lesson/node ID
    const courseId = searchParams.get('courseId');
    const userId = searchParams.get('userId');
    const format = searchParams.get('format'); // Legacy parameter (ignored when missing)

    console.log(`[Content API] Request received - courseId: ${courseId}, nodeId: ${nodeId}`);

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
    const backendUrl = new URL(`${NEXT_PUBLIC_BACKEND_API_URL}/courses/${courseId}/nodes/${nodeId}`);
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

    // V2 Content Detection: If content has version 2 and sections array, pass through directly
    if (contentPayload.version === 2 && Array.isArray(contentPayload.sections)) {
      const resolvedMasteryStatus = lesson.mastery_status || contentPayload.mastery_status || 'pending';
      const resolvedFamiliarity = lesson.familiarity_score ?? contentPayload.familiarity_score ?? null;
      const resolvedInteractiveTaskCompleted =
        lesson.interactive_task_completed ?? contentPayload.interactive_task_completed ?? false;
      const resolvedAssessmentCompleted =
        lesson.assessment_completed ?? contentPayload.assessment_completed ?? false;

      console.log('[Content API] V2 content detected, passing through directly');
      return NextResponse.json({
        format: 'v2',
        data: {
          // Pass through entire V2 content payload
          ...contentPayload,
          interactive_task_completed: resolvedInteractiveTaskCompleted,
          assessment_completed: resolvedAssessmentCompleted,
          interactive_task_attempts: contentPayload.interactive_task_attempts || lesson.interactive_task_attempts || {},
          interactive_task_attempt: contentPayload.interactive_task_attempt || lesson.interactive_task_attempt || null,
          section_attempts: contentPayload.section_attempts || lesson.section_attempts || {},
          assessment_attempt: contentPayload.assessment_attempt || lesson.assessment_attempt || null,
          // Include lesson metadata
          id: lesson.id,
          title: contentPayload.title || lesson.title,
          module_ref: lesson.module_ref,
          estimated_minutes: lesson.estimated_minutes,
          bloom_level: lesson.bloom_level,
          mastery_status: resolvedMasteryStatus,
          familiarity_score: resolvedFamiliarity,
        }
      });
    }

    // V1 Content: Continue with legacy transformation
    const resolvedReadingCompleted = lesson.readingCompleted ?? contentPayload.readingCompleted ?? false;
    const resolvedVideoCompleted = lesson.videoCompleted ?? contentPayload.videoCompleted ?? false;
    const resolvedQuizCompleted = lesson.quizCompleted ?? contentPayload.quizCompleted ?? false;
    const resolvedInteractiveTaskCompleted =
      lesson.interactive_task_completed ?? contentPayload.interactive_task_completed ?? false;
    const resolvedAssessmentCompleted =
      lesson.assessment_completed ?? contentPayload.assessment_completed ?? false;
    const resolvedMasteryStatus = lesson.mastery_status || contentPayload.mastery_status || 'pending';
    const resolvedFamiliarity = lesson.familiarity_score ?? contentPayload.familiarity_score ?? null;
    const inlineQuestionSelections = (() => {
      if (
        contentPayload.inlineQuestionSelections &&
        typeof contentPayload.inlineQuestionSelections === 'object' &&
        !Array.isArray(contentPayload.inlineQuestionSelections)
      ) {
        return contentPayload.inlineQuestionSelections;
      }
      if (Array.isArray(contentPayload.inlineQuestions)) {
        return contentPayload.inlineQuestions.reduce((acc, item) => {
          if (!item) return acc;
          const idx = item.questionIndex;
          if (idx === undefined || idx === null) return acc;
          if (item.selectedAnswer === undefined || item.selectedAnswer === null) return acc;
          acc[idx] = item.selectedAnswer;
          return acc;
        }, {});
      }
      return {};
    })();

    // Log quiz data specifically if present
    if (contentPayload.quiz) {
      console.log('[Content API] Quiz data from backend:', JSON.stringify(contentPayload.quiz, null, 2));
    }

    // Transform the backend response to match the frontend's expected format
    // The frontend expects { format, data } where data contains the content
    const contentSequence = Array.isArray(contentPayload.content_sequence)
      ? contentPayload.content_sequence
      : Array.isArray(contentPayload.contentSequence)
      ? contentPayload.contentSequence
      : null;

    const transformedResponse = {
      ...(format ? { format } : {}),
      data: {
        // Lesson metadata
        id: lesson.id,
        title: lesson.title,
        module_ref: lesson.module_ref,
        estimated_minutes: lesson.estimated_minutes,
        bloom_level: lesson.bloom_level,
        
        // Completion status from backend (user_node_state)
        readingCompleted: resolvedReadingCompleted,
        videoCompleted: resolvedVideoCompleted,
        quizCompleted: resolvedQuizCompleted,
        mastery_status: resolvedMasteryStatus,
        familiarity_score: resolvedFamiliarity,
        interactive_task_completed: resolvedInteractiveTaskCompleted,
        assessment_completed: resolvedAssessmentCompleted,
        interactive_task_attempts: contentPayload.interactive_task_attempts || {},
        interactive_task_attempt: contentPayload.interactive_task_attempt || null,
        section_attempts: contentPayload.section_attempts || {},
        assessment_attempt: contentPayload.assessment_attempt || null,

        // Content ordering from backend
        ...(contentSequence ? { content_sequence: contentSequence } : {}),
        
        // Inline question selections from backend
        inlineQuestionSelections,
        
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
        
        // Interactive Task (replaces deprecated interactive_practice)
        ...((contentPayload.interactive_practice || contentPayload.interactivePractice || lesson.interactive_practice || lesson.interactivePractice || contentPayload.interactive_task || contentPayload.interactiveTask || lesson.interactive_task || lesson.interactiveTask) && {
          interactive_task: contentPayload.interactive_practice || contentPayload.interactivePractice || lesson.interactive_practice || lesson.interactivePractice || contentPayload.interactive_task || contentPayload.interactiveTask || lesson.interactive_task || lesson.interactiveTask
        }),

        // V1.5 Assessment (atomic components with layout and grading_logic)
        ...(contentPayload.assessment?.layout && contentPayload.assessment?.grading_logic && {
          assessment: contentPayload.assessment
        }),

        // V1.5 Interactive Tasks (multiple tasks array)
        ...(Array.isArray(contentPayload.interactive_tasks) && contentPayload.interactive_tasks.length > 0 && {
          interactive_tasks: contentPayload.interactive_tasks
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

# Testing the course topic view locally

Use the built-in mock data set when you want to exercise the topic renderer without relying on Supabase auth or the production content service.

## 1. Enable the mock data flag
Create (or update) `.env.local` in the project root with the following line:

```
NEXT_PUBLIC_USE_MOCK_COURSE=true
```

You can optionally pre-select a topic by adding:

```
NEXT_PUBLIC_MOCK_TOPIC=Module 1 - Learn Topics/Heaps
```

## 2. Start the dev server
Install dependencies if you have not already and run the Next.js dev server:

```
npm install
npm run dev
```

## 3. Open the demo course page
Navigate to [http://localhost:3000/courses/demo-course](http://localhost:3000/courses/demo-course). With the mock flag enabled the page loads `mock/course-topics-demo.json`, bypassing Supabase and the backend proxy. The course sidebar and content area are populated with:

- A reading that demonstrates Markdown, inline math, and block math
- An embedded video with supporting rich text
- A flashcard deck sourced from the sample cards
- A quiz that mixes standard questions with a sequence-style item

## 4. Return to live data
Remove or comment out `NEXT_PUBLIC_USE_MOCK_COURSE` in `.env.local` when you are ready to reconnect to the backend APIs. The course view will switch back to Supabase-authenticated fetches and proxy all content requests through `/api/courses/data` and `/api/content`.

## Live data contract

When mock mode is disabled the page expects `/api/courses/data` to respond with a JSON payload that includes a `course_data` object. Each key inside `course_data` should be the human-readable topic title (for example `"Module 1 - Introduction"`). The value for a topic can be either:

- An array of content item objects, or
- An object that contains an `items`/`content`/`sections` array plus optional metadata such as `summary` or `description` that will be rendered above the items.

Every content item should follow these rules so `TopicRenderer` knows how to display it:

1. Provide a `format` (or `type`/`content_type`) using one of the supported aliases: `reading`, `video`, `flashcards`, `quiz`, `mini_quiz`, `practice_quiz`, `practice_exam`, or `assessment`.
2. Include an identifier (`id`, `content_id`, `resource_id`, etc.) when the frontend needs to fetch the full payload through `/api/content?format=…&id=…`. If you inline the data on the item, place it under a `data`, `payload`, `resource`, or `contentData` property instead.
3. Textual fields such as `summary`, `description`, `body`, and topic-level `overview` should be plain strings. Markdown and LaTeX are supported; the rich-text parser will convert them into blocks automatically.
4. Video entries should expose a playable URL via `url`, `video_url`, or `link`.
5. Flashcard sets can be arrays or objects; each entry is normalized into `[question, answer, explanation]` before rendering.
6. Quiz-like formats should supply a `questions`/`items` array (objects are passed directly to the quiz component).

Finally, make sure the dynamic route parameter (`[courseId]`) is a UUID when hitting the live endpoints. Non-UUID slugs are reserved for the mock workflow and will trigger a helpful validation error in the UI.

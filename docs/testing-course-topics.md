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

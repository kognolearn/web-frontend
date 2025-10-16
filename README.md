Backend API
-----------

Course search is served by the backend API hosted on Render:

- Base URL: https://edtech-backend-api.onrender.com
- Endpoint: GET /courses?query=<term>
- Auth: None

The frontend proxies requests through `app/api/catalog-search/route.js` and returns `{ results: [{ id, code, title }] }` to the UI.

Environment
-----------

The backend uses Supabase and requires the following environment variables in the Render service:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Optional (non-Render environments): set `PUBLIC_BASE_URL` to influence startup logs.

Local Development
-----------------

Provide the client-side Supabase env vars in `.env.local` for the web app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_KEY`

Notes
-----

If you deploy the backend elsewhere, update the base URL referenced in `app/api/catalog-search/route.js`.


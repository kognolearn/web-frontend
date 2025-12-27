# Web Frontend AI Instructions

## Architecture Overview
- **Framework**: Next.js 16 (App Router) with React 19.
- **Styling**: Tailwind CSS v4 with `globals.css`.
- **Auth**: Supabase SSR (`@supabase/ssr`) integrated via `SupabaseSessionProvider`.
- **Math Rendering**: `better-react-mathjax`, `katex`, `rehype-katex`.
  - Custom macros defined in `app/layout.js` (e.g., `\rect`, `\sinc`, `\F`).

## Critical Workflows
- **Development**: `npm run dev` (uses Turbopack).
- **Build**: `npm run build`.
- **Lint**: `npm run lint`.

## Project Conventions
- **Component Structure**:
  - Located in `components/`, organized by feature (`admin`, `auth`, `chat`, `content`, `courses`, `theme`, `ui`).
  - Use `lucide-react` for icons.
  - Use `framer-motion` for animations.
- **Data Fetching**:
  - Supabase client initialized in `lib/supabase/client.js`.
  - Backend API requests often proxied via Next.js API routes (e.g., `app/api/catalog-search/route.js`).
- **Theme**:
  - `ThemeProvider` and `ThemeToggle` for dark/light mode.
  - Fonts: Nunito (Google Fonts).

## Integrations & Dependencies
- **Supabase**: Client-side auth and data access.
- **Backend API**: Interacts with the Express backend (often via proxy).
- **UI Libraries**: `@dnd-kit` (drag & drop), `monaco-editor` (code editing), `recharts` (charts).

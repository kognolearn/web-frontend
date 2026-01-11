import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Routes that are allowed on the web (not blocked for authenticated users)
const WEB_ALLOWED_PATHS = [
  '/',                // Home/onboarding (exact match)
  '/auth',            // All auth routes
  '/download',        // Download page
  '/pricing',         // Pricing page
  '/checkout',        // Checkout flow
  '/courses/create',  // Course creation (part of onboarding)
  '/join',            // Share join links
  '/share',           // Share pages
  '/api',             // API routes (needed by desktop app)
  '/help',            // Help pages
]

/**
 * Check if a path is allowed for web users (not redirected to /download)
 */
function isWebAllowedPath(pathname) {
  // Home page is allowed (exact match)
  if (pathname === '/') return true

  // Check if path starts with any allowed prefix
  for (const allowedPath of WEB_ALLOWED_PATHS) {
    if (allowedPath === '/') continue // Already handled above
    if (pathname.startsWith(allowedPath)) {
      // Special case: /courses/create is allowed, but /courses/[id] is not
      if (allowedPath === '/courses/create') {
        // Only allow exact /courses/create path
        return pathname === '/courses/create' || pathname.startsWith('/courses/create/')
      }
      return true
    }
  }

  // Check for /courses paths that are NOT /courses/create
  if (pathname.startsWith('/courses')) {
    // Block /courses/[courseId]/* paths
    return false
  }

  return false
}

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const hostname = request.headers.get('host')

  // Check if we are on dev.kognolearn.com
  if (hostname === 'dev.kognolearn.com') {
    // Allow auth related routes to proceed to avoid blocking sign-in/callback flows
    if (request.nextUrl.pathname.startsWith('/auth/callback') || 
        request.nextUrl.pathname.startsWith('/api/auth')) {
      return response
    }

    if (!user) {
      // If not signed in, redirect to sign-in page
      // Avoid redirect loop if already on sign-in page or other auth pages
      if (!request.nextUrl.pathname.startsWith('/auth/')) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/sign-in'
        url.searchParams.set('redirectTo', request.nextUrl.pathname)
        return NextResponse.redirect(url)
      }
    } else {
      // If signed in, check if admin
      const { data: adminData, error } = await supabase
        .from('admins')
        .select('email')
        .eq('email', user.email)
        .single()

      if (error || !adminData) {
        // Not an admin, redirect to production
        return NextResponse.redirect('https://kognolearn.com')
      }
    }
  }

  // Redirect authenticated web users away from product routes to /download
  // This ensures the product is only accessible from the desktop app
  if (user && !isWebAllowedPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/download'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

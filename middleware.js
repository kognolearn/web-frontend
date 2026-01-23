import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { isDownloadRedirectEnabled } from './lib/featureFlags'

// Routes that are allowed on the web (not blocked for authenticated users)
const WEB_ALLOWED_PATHS = [
  '/',                // Home/onboarding (exact match)
  '/auth',            // All auth routes
  '/sign-up',         // Create account redirect route
  '/download',        // Download page
  '/pricing',         // Pricing page
  '/checkout',        // Checkout flow
  '/courses/create',  // Course creation (part of onboarding)
  '/join',            // Share join links
  '/share',           // Share pages
  '/api',             // API routes (needed by desktop app)
  '/help',            // Help pages
  '/admin',           // Admin routes (has its own auth flow)
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

const AUTH_PAGE_PATHS = [
  '/auth/sign-in',
  '/auth/create-account',
  '/auth/sign-up',
  '/auth/signup',
  '/sign-up',
]

function isAuthPagePath(pathname) {
  return AUTH_PAGE_PATHS.some((authPath) =>
    pathname === authPath || pathname.startsWith(`${authPath}/`)
  )
}

function isSignedOutAllowedPath(pathname) {
  if (pathname === '/') return true
  if (pathname.startsWith('/api')) return true
  if (pathname === '/auth/sign-in' || pathname.startsWith('/auth/sign-in/')) return true
  if (pathname === '/auth/create-account' || pathname.startsWith('/auth/create-account/')) return true
  if (pathname === '/auth/sign-up' || pathname.startsWith('/auth/sign-up/')) return true
  if (pathname === '/sign-up' || pathname.startsWith('/sign-up/')) return true
  if (pathname === '/auth/confirm-email' || pathname.startsWith('/auth/confirm-email/')) return true
  if (pathname === '/auth/callback' || pathname.startsWith('/auth/callback/')) return true
  return false
}

export async function middleware(request) {
  const forceDownloadRedirect = isDownloadRedirectEnabled()
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
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const pathname = request.nextUrl.pathname

  // Handle admin routes with separate auth flow
  if (pathname.startsWith('/admin')) {
    // Always allow the admin sign-in page
    if (pathname === '/admin/sign-in') {
      // If already authenticated and is admin, redirect to admin dashboard
      if (user) {
        const { data: adminData } = await supabase
          .from('admins')
          .select('email')
          .eq('email', user.email)
          .single()

        if (adminData) {
          const url = request.nextUrl.clone()
          url.pathname = '/admin'
          return NextResponse.redirect(url)
        }
      }
      return response
    }

    // For other admin routes, require authentication
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/sign-in'
      return NextResponse.redirect(url)
    }

    // Check if user is admin
    const { data: adminData, error } = await supabase
      .from('admins')
      .select('email')
      .eq('email', user.email)
      .single()

    if (error || !adminData) {
      // Not an admin - redirect to admin sign-in with error
      const url = request.nextUrl.clone()
      url.pathname = '/admin/sign-in'
      url.searchParams.set('error', 'not_admin')
      return NextResponse.redirect(url)
    }

    // User is admin, allow access
    return response
  }

  if (pathname.startsWith('/api')) {
    return response
  }

  if (!user) {
    if (!isSignedOutAllowedPath(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      if (!url.searchParams.has('redirectTo')) {
        const redirectPath = `${pathname}${request.nextUrl.search}`
        url.searchParams.set('redirectTo', redirectPath)
      }
      return NextResponse.redirect(url)
    }
    return response
  }

  let hasAccess = false
  let trialExpired = false

  // Call backend directly (internal API routes can fail on Vercel Edge)
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://api.kognolearn.com'

  try {
    const headers = {}
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
    const statusRes = await fetch(`${backendUrl}/stripe/subscription-status`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })
    if (statusRes.ok) {
      const status = await statusRes.json().catch(() => ({}))
      // hasBasicAccess is true for free tier users who can use the app with limits
      hasAccess = Boolean(status?.hasSubscription) || Boolean(status?.trialActive) || Boolean(status?.hasBasicAccess)
    }
  } catch (error) {
    // Keep defaults on status failures.
  }

  if (!hasAccess) {
    try {
      const headers = {}
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
      const negotiationRes = await fetch(`${backendUrl}/onboarding/negotiation-status`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      })
      if (negotiationRes.ok) {
        const negotiation = await negotiationRes.json().catch(() => ({}))
        const trialStatus = typeof negotiation?.trialStatus === 'string' ? negotiation.trialStatus : 'none'
        if (trialStatus === 'active' || trialStatus === 'expired_free') {
          // active trial or free tier user (accepted trial in past) should go to dashboard
          hasAccess = true
        } else if (trialStatus === 'expired') {
          // expired trial but hasn't chosen free plan yet - show negotiation UI
          trialExpired = true
        }
      }
    } catch (error) {
      // Keep defaults on negotiation status failures.
    }
  }

  if (hasAccess) {
    if (pathname === '/' || isAuthPagePath(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  } else if (!trialExpired && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated web users away from product routes to /download
  // This ensures the product is only accessible from the desktop app
  if (forceDownloadRedirect && user && !isWebAllowedPath(request.nextUrl.pathname)) {
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

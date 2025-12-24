import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

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

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * This app has only one page at /. Redirect any unknown path to / so users
 * never see "404 This page could not be found."
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow the root page (exact match or trailing slash)
  if (pathname === '/' || pathname === '') {
    return NextResponse.next();
  }

  // Allow API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static assets
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }
  if (/\.(ico|svg|png|jpg|jpeg|gif|webp|woff2?|css|js)$/i.test(pathname)) {
    return NextResponse.next();
  }

  // Redirect everything else to home
  const url = request.nextUrl.clone();
  url.pathname = '/';
  return NextResponse.redirect(url);
}

export const config = {
  // Run on all paths except static files and images
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

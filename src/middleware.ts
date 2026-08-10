import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get session cookie
  const session = request.cookies.get('session')?.value;
  
  // Decrypt/Verify session
  const payload = session ? await decrypt(session) : null;
  
  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!payload) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  
  // Redirect logged-in users away from login page
  if (pathname.startsWith('/login')) {
    if (payload) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};

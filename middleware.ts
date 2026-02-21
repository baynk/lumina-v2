import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const ADMIN_EMAILS = new Set(['ryan@ryanwright.io', 'luminastrology@gmail.com']);
const ADMIN_DOMAINS = new Set(['ryanwright.io']);

function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  if (ADMIN_EMAILS.has(email)) return true;
  const domain = email.split('@')[1];
  return ADMIN_DOMAINS.has(domain || '');
}

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname, search } = request.nextUrl;

  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  if (pathname.startsWith('/admin') && !isAdminEmail(token.email)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};

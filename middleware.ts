import { NextRequest, NextResponse } from 'next/server';

// Every /api/dashboard/* route requires the dashboard cookie, except login/logout.
// Same token as lib/auth/dashboard.ts (`authed.<hmac-sha256 hex>`), recomputed with
// Web Crypto because middleware runs on the Edge runtime (no node:crypto).
export const config = { matcher: '/api/dashboard/:path*' };

const OPEN = new Set(['/api/dashboard/login', '/api/dashboard/logout']);

async function expectedToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('authed'));
  const hex = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
  return `authed.${hex}`;
}

export async function middleware(req: NextRequest) {
  if (OPEN.has(req.nextUrl.pathname)) return NextResponse.next();
  if (!process.env.AUTHOR_DASH_PASSWORD) return NextResponse.next(); // matches isDashboardProtected()

  const cookie = req.cookies.get('dashboard_auth')?.value;
  const secret = process.env.AUTHOR_DASH_COOKIE_SECRET || 'dev-secret-change-me';
  if (cookie && cookie === (await expectedToken(secret))) return NextResponse.next();

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

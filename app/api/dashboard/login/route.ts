import { NextRequest, NextResponse } from 'next/server';
import { checkPassword, createAuthCookie, isDashboardProtected } from '@/lib/auth/dashboard';

const COOKIE_NAME = 'dashboard_auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!isDashboardProtected()) {
    return NextResponse.json({ ok: true });
  }

  if (!checkPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, createAuthCookie(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

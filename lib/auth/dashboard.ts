import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = 'dashboard_auth';
const PASSWORD = process.env.AUTHOR_DASH_PASSWORD;
const COOKIE_SECRET = process.env.AUTHOR_DASH_COOKIE_SECRET || 'dev-secret-change-me';

function signToken(value: string): string {
  const hmac = crypto.createHmac('sha256', COOKIE_SECRET);
  hmac.update(value);
  return `${value}.${hmac.digest('hex')}`;
}

function verifyToken(signed: string): string | null {
  const lastDot = signed.lastIndexOf('.');
  if (lastDot === -1) return null;
  const value = signed.slice(0, lastDot);
  const expected = signToken(value);
  if (signed !== expected) return null;
  return value;
}

export function isDashboardProtected(): boolean {
  return !!PASSWORD;
}

export async function isDashboardAuthed(req?: NextRequest): Promise<boolean> {
  if (!isDashboardProtected()) return true;

  let cookieValue: string | undefined;
  if (req) {
    cookieValue = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    cookieValue = cookieStore.get(COOKIE_NAME)?.value;
  }

  if (!cookieValue) return false;
  const value = verifyToken(cookieValue);
  return value === 'authed';
}

export function createAuthCookie(): string {
  return signToken('authed');
}

export function checkPassword(input: string): boolean {
  if (!PASSWORD) return true;
  return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(PASSWORD));
}

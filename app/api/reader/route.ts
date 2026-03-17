import { NextResponse } from 'next/server';

// Legacy reader route — use /api/public/session instead.
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/public/session instead.' },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/public/session instead.' },
    { status: 410 }
  );
}

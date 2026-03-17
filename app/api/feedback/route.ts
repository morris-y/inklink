import { NextResponse } from 'next/server';

// Legacy feedback route — use /api/public/reactions, /api/public/comments,
// or /api/public/suggestions instead.
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/public/reactions, /api/public/comments, or /api/public/suggestions.' },
    { status: 410 }
  );
}

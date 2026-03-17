import { NextResponse } from 'next/server';

// Token-based word tracking is no longer used in the Postgres schema.
// Lines are tracked via chapter_version_lines. This stub exists for compatibility.
export async function GET() {
  return NextResponse.json({ tokens: [], commitSha: null });
}

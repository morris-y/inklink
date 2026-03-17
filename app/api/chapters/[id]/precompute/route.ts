import { NextResponse } from 'next/server';

// Pre-computation of word tokens is no longer used in the Postgres schema.
// This stub exists for compatibility with existing frontend components.
export async function POST() {
  return NextResponse.json({ status: 'complete', message: 'Not required with Postgres schema' });
}

export async function GET() {
  return NextResponse.json({ status: 'complete' });
}

import { NextRequest, NextResponse } from 'next/server';
import { forceIngest } from '@/lib/ingest/run-ingest';
import crypto from 'crypto';

/**
 * POST /api/ingest
 *
 * Triggers a fresh ingest of the current commit. Two ways to call this:
 *
 * 1. GitHub webhook — add a "push" webhook in your repo settings pointing at
 *    https://your-app.vercel.app/api/ingest and set the secret to
 *    INGEST_WEBHOOK_SECRET in your env vars.
 *
 * 2. Local dev after a commit — call with your AUTHOR_DASH_PASSWORD header:
 *    curl -X POST http://localhost:3000/api/ingest \
 *         -H "Authorization: Bearer <AUTHOR_DASH_PASSWORD>"
 *
 * On Vercel the startup ingest (instrumentation.ts) already handles every
 * deploy automatically, so this endpoint is mainly useful for local dev and
 * manual backfills.
 */
export async function POST(req: NextRequest) {
  // Auth: accept either a GitHub webhook signature or the dashboard password
  const authorized = await isAuthorized(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await forceIngest();
    return NextResponse.json({
      ok: true,
      alreadyExisted: result.alreadyExists,
      chaptersIngested: result.chaptersIngested,
      documentVersionId: result.documentVersionId,
    });
  } catch (err) {
    console.error('[/api/ingest] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ingest failed' },
      { status: 500 },
    );
  }
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const webhookSecret = process.env.INGEST_WEBHOOK_SECRET;
  const dashPassword = process.env.AUTHOR_DASH_PASSWORD;

  // GitHub webhook: verify HMAC-SHA256 signature
  if (webhookSecret) {
    const sig = req.headers.get('x-hub-signature-256');
    if (sig) {
      const body = await req.text();
      const expected = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    }
  }

  // Dashboard password bearer token
  if (dashPassword) {
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (token.length > 0 && token.length === dashPassword.length) {
      return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(dashPassword));
    }
    return false;
  }

  // No auth configured → open (dev mode)
  return true;
}

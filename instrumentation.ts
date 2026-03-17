/**
 * Next.js instrumentation hook — runs once when the server starts.
 *
 * On Vercel: each deploy launches a new server process, so this fires
 * for every push to the connected branch and materialises that commit's
 * chapters into Postgres automatically.
 *
 * Locally: fires once when `next dev` starts. Run `POST /api/ingest`
 * (or restart the server) to pick up new commits.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run in the Node.js runtime (not in the Edge runtime)
    if (!process.env.DATABASE_URL) {
      console.warn('[ingest] DATABASE_URL not set — skipping ingest');
      return;
    }
    try {
      const { ensureIngested } = await import('./lib/ingest/run-ingest');
      const result = await ensureIngested();
      if (result.alreadyExists) {
        console.log(`[ingest] commit ${result.documentVersionId.slice(0, 8)} already ingested`);
      } else {
        console.log(`[ingest] ingested ${result.chaptersIngested} chapter(s) for commit ${result.documentVersionId.slice(0, 8)}`);
      }
    } catch (err) {
      console.error('[ingest] startup ingest failed:', err);
    }
  }
}

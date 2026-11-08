# Inklink (Morris's fork)

Draft-review site for Morris's writing: readers highlight, like, comment, and suggest edits. Fork of divyavenn/inklink; `README.md` is the upstream template and is not the source of truth for this fork.

## Content flow
- Chapters come from the Obsidian vault (`Publish/*.md`) via `~/Projects/Morris/scripts/inklink-sync.mjs`: `npm run inklink:push -- --commit` (vault → `chapters/`), `npm run inklink:pull` (back to the vault). Full pipeline: `~/.claude/docs/seo.md`, "Publishing pipeline".
- Edit chapter text in `chapters/` or the vault, never in the database. On every deploy, `instrumentation.ts` ingests that commit's `chapters/` into Postgres; reader feedback is stored per chapter version.
- Chinese drafts only; English never goes to Inklink. The site is `noindex` (drafts; the canonical copy is morrisshyang.com).

## Databases (Neon project `inklink`, not connected through the Vercel integration)
- `production` branch: `DATABASE_URL` in the Vercel Production environment only.
- `preview` branch (copy of production, auto-delete off): `DATABASE_URL` in the Vercel Preview environment. Previews ingest and write here.
- Never give Preview the production connection string: startup ingest runs DDL and upserts chapters, so a preview would write into production data.
- `TITLE` is unset in Preview on purpose: non-ASCII titles slug to `default`, the same work slug production uses.

## Upstream code
- `.github/workflows/sync-upstream.yml` hard-overwrites everything except `chapters/`, `info.json`, and workflows. It is disabled (`gh workflow disable "Sync upstream"`, 2026-11-08) because it would erase this fork's changes. Pick upstream commits by hand instead; do not re-enable it.

## Working here
- Main checkout stays on `main`; work in a worktree from `origin/main`, open a PR, `gh pr edit <n> --add-label ready`, stop.
- Local `next build` needs `DATABASE_URL`; with a dummy URL it compiles and then fails prerendering `/` (no DB). That failure is expected.
- Preview deployments are behind Vercel login; verify them in a logged-in browser, not curl.
- Design tasks: use the design-lab skill. Palette: paper `#f7f5f0` (page) / `#f2ede4`, ink `#1a1a18`, vermilion `#c83e2a`.

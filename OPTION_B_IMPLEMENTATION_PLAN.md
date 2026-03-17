# OPTION_B_IMPLEMENTATION_PLAN.md

## Goal

Refactor the app into a GitHub-backed, Neon/Vercel-deployable versioned reader-feedback system where:
- GitHub remains the source of truth for manuscript history
- the app materializes deployed commits into Postgres for fast querying
- every feedback/event record is attached to a concrete chapter version
- authors can filter dashboard analytics by version, chapter, reader, group, and invite source
- no backwards compatibility is required

## Target architecture

### Canonical source of truth
- Manuscript files live in GitHub as Markdown files in the repo.
- Each deploy corresponds to one Git commit SHA.
- That commit SHA defines one immutable manuscript version.

### App query layer
On deploy or first server boot for a given commit:
- read current markdown files from repo checkout
- detect current commit SHA
- create a `document_version`
- create `chapter_versions`
- create normalized line records for each chapter version
- optionally compute diffs against the previous deployed version

Dashboard queries should hit Postgres only.
Do not fetch historical chapter state from GitHub during normal dashboard reads.

## Core design decisions

### 1. No SQLite
Remove SQLite entirely.
Use Neon Postgres only.

### 2. No compatibility layer
Delete or replace old schema, old APIs, and old ingestion logic as needed.
Do not keep transitional adapters.

### 3. Version snapshots are materialized
GitHub owns the history.
Postgres stores an indexed/queryable projection of deployed history.

### 4. Feedback is line-range based
All reactions/comments/suggestions attach to:
- `chapter_version_id`
- `start_line`
- `end_line`

Do not anchor feedback to snippet text as the primary identifier.

### 5. Reader attribution is first-class
Support:
- anonymous public readers
- named reader invite links
- group invite links
- dashboard filters by reader/group/invite

### 6. Auth is lightweight
Dashboard auth is controlled by optional env variable:
- unset => dashboard open
- set => password gate with signed cookie

## Final system capabilities
- one-click fork + Vercel + Neon deployment
- markdown chapters in repo
- one immutable app-level version per deployed commit
- version timeline by chapter
- line heatmaps by version
- comments and suggested edits grouped by line range
- retention/drop-off analytics by version/chapter
- author-created reader/group invite links
- dashboard filtering by reader/group/invite
- interest email capture

## New database schema

### `works`
- `id` uuid pk
- `slug` text unique not null
- `title` text not null
- `description` text null
- `repo_owner` text null
- `repo_name` text null
- `default_branch` text not null default 'main'
- `created_at` timestamptz not null default now()

### `chapters`
- `id` uuid pk
- `work_id` uuid not null references works(id)
- `slug` text not null
- `title` text not null
- `file_path` text not null
- `sort_order` int not null
- `created_at` timestamptz not null default now()
- unique `(work_id, file_path)`

### `document_versions`
- `id` uuid pk
- `work_id` uuid not null references works(id)
- `commit_sha` text not null
- `commit_message` text null
- `commit_author` text null
- `commit_created_at` timestamptz null
- `deployed_at` timestamptz not null default now()
- `is_active` boolean not null default true
- unique `(work_id, commit_sha)`

### `chapter_versions`
- `id` uuid pk
- `chapter_id` uuid not null references chapters(id)
- `document_version_id` uuid not null references document_versions(id)
- `version_number` int not null
- `title` text not null
- `raw_markdown` text not null
- `rendered_html` text not null
- `line_count` int not null
- `word_count` int not null
- `char_count` int not null
- `created_at` timestamptz not null default now()
- unique `(chapter_id, document_version_id)`

### `chapter_version_lines`
- `id` uuid pk
- `chapter_version_id` uuid not null references chapter_versions(id)
- `line_number` int not null
- `line_text` text not null
- `line_hash` text not null
- `block_type` text null
- indexes on `(chapter_version_id, line_number)` and `(chapter_version_id, line_hash)`

### `chapter_diffs`
- `id` uuid pk
- `chapter_version_id` uuid not null references chapter_versions(id)
- `previous_chapter_version_id` uuid null references chapter_versions(id)
- `added_lines` int not null default 0
- `removed_lines` int not null default 0
- `changed_lines` int not null default 0
- `diff_json` jsonb not null

### `reader_profiles`
- `id` uuid pk
- `work_id` uuid not null references works(id)
- `slug` text not null
- `display_name` text not null
- `email` text null
- `notes` text null
- `created_at` timestamptz not null default now()
- unique `(work_id, slug)`

### `reader_groups`
- `id` uuid pk
- `work_id` uuid not null references works(id)
- `slug` text not null
- `name` text not null
- `description` text null
- `created_at` timestamptz not null default now()
- unique `(work_id, slug)`

### `reader_group_memberships`
- `id` uuid pk
- `reader_profile_id` uuid not null references reader_profiles(id)
- `reader_group_id` uuid not null references reader_groups(id)
- unique `(reader_profile_id, reader_group_id)`

### `reader_invites`
- `id` uuid pk
- `work_id` uuid not null references works(id)
- `token` text not null unique
- `reader_profile_id` uuid null references reader_profiles(id)
- `reader_group_id` uuid null references reader_groups(id)
- `label` text null
- `is_active` boolean not null default true
- `expires_at` timestamptz null
- `created_at` timestamptz not null default now()

### `reader_sessions`
- `id` uuid pk
- `work_id` uuid not null references works(id)
- `anonymous_id` text not null
- `reader_profile_id` uuid null references reader_profiles(id)
- `reader_group_id` uuid null references reader_groups(id)
- `reader_invite_id` uuid null references reader_invites(id)
- `first_seen_at` timestamptz not null default now()
- `last_seen_at` timestamptz not null default now()
- `user_agent` text null
- `referrer` text null
- `utm_source` text null
- `utm_medium` text null
- `utm_campaign` text null

### `chapter_reads`
- `id` uuid pk
- `reader_session_id` uuid not null references reader_sessions(id)
- `chapter_version_id` uuid not null references chapter_versions(id)
- `started_at` timestamptz not null default now()
- `last_active_at` timestamptz not null default now()
- `completed_at` timestamptz null
- `max_line_seen` int not null default 0
- `max_scroll_percent` numeric(5,2) not null default 0
- `active_seconds` int not null default 0
- `completion_percent` numeric(5,2) not null default 0
- unique `(reader_session_id, chapter_version_id)`

### `event_log`
- `id` uuid pk
- `reader_session_id` uuid null references reader_sessions(id)
- `work_id` uuid not null references works(id)
- `chapter_version_id` uuid null references chapter_versions(id)
- `reader_profile_id` uuid null references reader_profiles(id)
- `reader_group_id` uuid null references reader_groups(id)
- `reader_invite_id` uuid null references reader_invites(id)
- `event_type` text not null
- `event_time` timestamptz not null default now()
- `payload` jsonb not null default '{}'

### `feedback_reactions`
- `id` uuid pk
- `reader_session_id` uuid not null references reader_sessions(id)
- `chapter_version_id` uuid not null references chapter_versions(id)
- `reader_profile_id` uuid null references reader_profiles(id)
- `reader_group_id` uuid null references reader_groups(id)
- `reader_invite_id` uuid null references reader_invites(id)
- `start_line` int not null
- `end_line` int not null
- `reaction` text not null check (reaction in ('like', 'dislike'))
- `created_at` timestamptz not null default now()

### `feedback_comments`
- `id` uuid pk
- `reader_session_id` uuid not null references reader_sessions(id)
- `chapter_version_id` uuid not null references chapter_versions(id)
- `reader_profile_id` uuid null references reader_profiles(id)
- `reader_group_id` uuid null references reader_groups(id)
- `reader_invite_id` uuid null references reader_invites(id)
- `start_line` int not null
- `end_line` int not null
- `body` text not null
- `created_at` timestamptz not null default now()

### `suggested_edits`
- `id` uuid pk
- `reader_session_id` uuid not null references reader_sessions(id)
- `chapter_version_id` uuid not null references chapter_versions(id)
- `reader_profile_id` uuid null references reader_profiles(id)
- `reader_group_id` uuid null references reader_groups(id)
- `reader_invite_id` uuid null references reader_invites(id)
- `start_line` int not null
- `end_line` int not null
- `original_text` text not null
- `suggested_text` text not null
- `rationale` text null
- `created_at` timestamptz not null default now()

### `interest_signups`
- `id` uuid pk
- `work_id` uuid not null references works(id)
- `reader_session_id` uuid null references reader_sessions(id)
- `reader_profile_id` uuid null references reader_profiles(id)
- `reader_group_id` uuid null references reader_groups(id)
- `reader_invite_id` uuid null references reader_invites(id)
- `chapter_version_id` uuid null references chapter_versions(id)
- `email` text not null
- `source` text null
- `created_at` timestamptz not null default now()
- unique `(work_id, email)`

## Ingestion pipeline

### Required env vars
```env
DATABASE_URL=
NEXT_PUBLIC_WORK_SLUG=
NEXT_PUBLIC_WORK_TITLE=
GIT_COMMIT_SHA=
GIT_COMMIT_MESSAGE=
GIT_COMMIT_AUTHOR=
GIT_COMMIT_CREATED_AT=
AUTHOR_DASH_PASSWORD=
AUTHOR_DASH_COOKIE_SECRET=
```

### Ingestion algorithm
1. Upsert `works`
2. Determine current commit SHA
3. Upsert `document_versions`
4. Read all markdown chapter files
5. For each file:
   - upsert stable `chapter`
   - parse title
   - render markdown to HTML
   - split into normalized lines
   - create `chapter_version`
   - insert `chapter_version_lines`
   - diff against prior chapter version
   - insert `chapter_diffs`
6. Mark current `document_version` active
7. Exit early if this commit is already ingested

### Idempotency requirements
Safe if:
- build runs twice
- server boots twice
- same commit redeploys
- concurrent requests trigger ingest

Use:
- unique constraints
- transactions
- advisory lock or lock row

## Target app structure
```txt
app/
  api/
    public/
      session/
      events/batch/
      reactions/
      comments/
      suggestions/
      interest/
    dashboard/
      login/
      logout/
      versions/
      chapters/[chapterId]/timeline/
      chapter-versions/[id]/heatmap/
      chapter-versions/[id]/feedback/
      chapter-versions/[id]/retention/
      readers/
      groups/
      invites/
      interest-signups/
  dashboard/
  read/
lib/
  auth/
    dashboard.ts
  db/
    client.ts
    schema.ts
  ingest/
    run-ingest.ts
    parse-chapter.ts
    diff-chapter.ts
  content/
    load-markdown.ts
    render-markdown.ts
    line-normalize.ts
  analytics/
    events.ts
    chapter-reads.ts
  invites/
    resolve-invite.ts
  readers/
    attribution.ts
```

## Public APIs

### `POST /api/public/session`
- input: `workSlug`, optional `inviteToken`
- creates/refreshes anonymous session
- resolves invite
- stamps session with reader/group/invite attribution

### `POST /api/public/events/batch`
Supports:
- `session_started`
- `chapter_viewed`
- `heartbeat`
- `scroll_depth`
- `line_reached`
- `chapter_completed`
- `cta_viewed`
- `email_submitted`

Behavior:
- validate
- append to `event_log`
- update `reader_sessions`
- upsert `chapter_reads`

### `POST /api/public/reactions`
- `chapterVersionId`
- `startLine`
- `endLine`
- `reaction`

### `POST /api/public/comments`
- `chapterVersionId`
- `startLine`
- `endLine`
- `body`

### `POST /api/public/suggestions`
- `chapterVersionId`
- `startLine`
- `endLine`
- `originalText`
- `suggestedText`
- `rationale`

### `POST /api/public/interest`
- `email`
- `workSlug`
- optional `chapterVersionId`

## Dashboard APIs
- `POST /api/dashboard/login`
- `POST /api/dashboard/logout`
- `GET /api/dashboard/versions`
- `GET /api/dashboard/chapters/:chapterId/timeline`
- `GET /api/dashboard/chapter-versions/:id/heatmap`
- `GET /api/dashboard/chapter-versions/:id/feedback`
- `GET /api/dashboard/chapter-versions/:id/retention`
- `GET /api/dashboard/readers`
- `POST /api/dashboard/readers`
- `GET /api/dashboard/groups`
- `POST /api/dashboard/groups`
- `GET /api/dashboard/invites`
- `POST /api/dashboard/invites`
- `GET /api/dashboard/interest-signups`

All dashboard query endpoints should accept optional filters:
- `readerProfileId`
- `readerGroupId`
- `readerInviteId`

## Dashboard auth
- If `AUTHOR_DASH_PASSWORD` is unset: dashboard is open
- If `AUTHOR_DASH_PASSWORD` is set:
  - protect `/dashboard`
  - protect `/api/dashboard/*`
  - require password form
  - set signed httpOnly cookie after login

## Reader/group invite system
Canonical route:
- `/read/i/[token]`

Optional vanity routes:
- `/read/[readerSlug]`
- `/read/group/[groupSlug]`

When a session is created from an invite:
- stamp `reader_profile_id`
- stamp `reader_group_id`
- stamp `reader_invite_id`

All feedback/events/signups inherit those IDs.

## Analytics model

### Client events
- `session_started`
- `chapter_viewed`
- `heartbeat`
- `scroll_depth`
- `line_reached`
- `chapter_completed`
- `cta_viewed`
- `email_submitted`

### Derived metrics
- readers started
- readers completed
- completion rate
- avg active seconds
- median stop line
- max-line reach curve
- email conversion rate

## Heatmap response shape
For each line:
- `lineNumber`
- `lineText`
- `likeCount`
- `dislikeCount`
- `netScore`
- `commentCount`
- `suggestionCount`
- `readerReachPercent`

## Diff model
Line-based diff in v1:
- added lines
- removed lines
- changed lines
- structured diff JSON

Do not attempt cross-version feedback remapping in v1.

## Implementation phases

### Phase 1 — Foundation
1. Remove SQLite
2. Add Neon/Postgres client
3. Add migrations
4. Create new schema
5. Wire env handling

### Phase 2 — Version ingestion
1. Build version tables
2. Add deploy/runtime ingest
3. Make ingest idempotent

### Phase 3 — Public reading path
1. Serve chapters from `chapter_versions`
2. Add anonymous session creation
3. Add canonical read route

### Phase 4 — Feedback rewrite
1. Replace old unified feedback model
2. Add reactions/comments/suggestions endpoints
3. Store feedback against `chapter_version_id` + line range

### Phase 5 — Retention analytics
1. Add `event_log`
2. Add batched event ingestion
3. Add `chapter_reads` rollup logic
4. Instrument client reader

### Phase 6 — Reader/group attribution
1. Add reader/group/invite tables
2. Add invite creation UI/API
3. Add session stamping
4. Add dashboard filters

### Phase 7 — Dashboard rebuild
1. Version timeline queries
2. Heatmap queries
3. Feedback sidebar queries
4. Retention queries
5. Interest signup export
6. Reader/group management UI

### Phase 8 — Auth + deployment polish
1. Password gate
2. Cookie auth
3. Update README
4. Add Vercel + Neon setup docs
5. Verify one-click deploy path

## What to skip in v1
- cross-version annotation migration
- GitHub API backfill beyond deployed snapshots
- full user accounts / OAuth
- collaborative author editing in browser
- automatic PR generation from suggestions
- heavy AI summarization
- moderation workflows
- multi-author permissions

## Acceptance criteria
1. A forked repo can deploy to Vercel with Neon
2. Deploy materializes current commit into version tables
3. Reader feedback attaches to exact chapter versions and line ranges
4. Dashboard filters by version/chapter/reader/group/invite
5. Dashboard shows:
   - version timeline
   - line heatmap
   - grouped comments/suggestions
   - retention/drop-off
   - interest signups
6. Authors can create individual and group invite links
7. Dashboard auth is optionally protected by env password
8. Ordinary dashboard queries do not require GitHub API calls

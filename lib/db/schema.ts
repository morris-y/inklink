export const CREATE_SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  repo_owner text,
  repo_name text,
  default_branch text NOT NULL DEFAULT 'main',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES works(id),
  slug text NOT NULL,
  title text NOT NULL,
  file_path text NOT NULL,
  sort_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_id, file_path)
);

CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES works(id),
  commit_sha text NOT NULL,
  commit_message text,
  commit_author text,
  commit_created_at timestamptz,
  deployed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_id, commit_sha)
);

CREATE TABLE IF NOT EXISTS chapter_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id),
  document_version_id uuid NOT NULL REFERENCES document_versions(id),
  version_number int NOT NULL,
  title text NOT NULL,
  raw_markdown text NOT NULL,
  rendered_html text NOT NULL,
  line_count int NOT NULL,
  word_count int NOT NULL,
  char_count int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, document_version_id)
);

CREATE TABLE IF NOT EXISTS chapter_version_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_version_id uuid NOT NULL REFERENCES chapter_versions(id),
  line_number int NOT NULL,
  line_text text NOT NULL,
  line_hash text NOT NULL,
  block_type text
);

CREATE INDEX IF NOT EXISTS idx_cvl_version_line ON chapter_version_lines(chapter_version_id, line_number);
CREATE INDEX IF NOT EXISTS idx_cvl_version_hash ON chapter_version_lines(chapter_version_id, line_hash);

CREATE TABLE IF NOT EXISTS chapter_diffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_version_id uuid NOT NULL REFERENCES chapter_versions(id),
  previous_chapter_version_id uuid REFERENCES chapter_versions(id),
  added_lines int NOT NULL DEFAULT 0,
  removed_lines int NOT NULL DEFAULT 0,
  changed_lines int NOT NULL DEFAULT 0,
  diff_json jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS reader_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES works(id),
  slug text NOT NULL,
  display_name text NOT NULL,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_id, slug)
);

CREATE TABLE IF NOT EXISTS reader_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES works(id),
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_id, slug)
);

CREATE TABLE IF NOT EXISTS reader_group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_profile_id uuid NOT NULL REFERENCES reader_profiles(id),
  reader_group_id uuid NOT NULL REFERENCES reader_groups(id),
  UNIQUE (reader_profile_id, reader_group_id)
);

CREATE TABLE IF NOT EXISTS reader_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES works(id),
  token text NOT NULL UNIQUE,
  reader_profile_id uuid REFERENCES reader_profiles(id),
  reader_group_id uuid REFERENCES reader_groups(id),
  label text,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reader_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES works(id),
  anonymous_id text NOT NULL,
  reader_profile_id uuid REFERENCES reader_profiles(id),
  reader_group_id uuid REFERENCES reader_groups(id),
  reader_invite_id uuid REFERENCES reader_invites(id),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text
);

CREATE INDEX IF NOT EXISTS idx_reader_sessions_anon ON reader_sessions(work_id, anonymous_id);

CREATE TABLE IF NOT EXISTS chapter_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_session_id uuid NOT NULL REFERENCES reader_sessions(id),
  chapter_version_id uuid NOT NULL REFERENCES chapter_versions(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  max_line_seen int NOT NULL DEFAULT 0,
  max_scroll_percent numeric(5,2) NOT NULL DEFAULT 0,
  active_seconds int NOT NULL DEFAULT 0,
  completion_percent numeric(5,2) NOT NULL DEFAULT 0,
  UNIQUE (reader_session_id, chapter_version_id)
);

CREATE TABLE IF NOT EXISTS event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_session_id uuid REFERENCES reader_sessions(id),
  work_id uuid NOT NULL REFERENCES works(id),
  chapter_version_id uuid REFERENCES chapter_versions(id),
  reader_profile_id uuid REFERENCES reader_profiles(id),
  reader_group_id uuid REFERENCES reader_groups(id),
  reader_invite_id uuid REFERENCES reader_invites(id),
  event_type text NOT NULL,
  event_time timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_event_log_session ON event_log(reader_session_id);
CREATE INDEX IF NOT EXISTS idx_event_log_chapter_version ON event_log(chapter_version_id);

CREATE TABLE IF NOT EXISTS feedback_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_session_id uuid NOT NULL REFERENCES reader_sessions(id),
  chapter_version_id uuid NOT NULL REFERENCES chapter_versions(id),
  reader_profile_id uuid REFERENCES reader_profiles(id),
  reader_group_id uuid REFERENCES reader_groups(id),
  reader_invite_id uuid REFERENCES reader_invites(id),
  start_line int NOT NULL,
  end_line int NOT NULL,
  reaction text NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reactions_chapter_version ON feedback_reactions(chapter_version_id);

CREATE TABLE IF NOT EXISTS feedback_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_session_id uuid NOT NULL REFERENCES reader_sessions(id),
  chapter_version_id uuid NOT NULL REFERENCES chapter_versions(id),
  reader_profile_id uuid REFERENCES reader_profiles(id),
  reader_group_id uuid REFERENCES reader_groups(id),
  reader_invite_id uuid REFERENCES reader_invites(id),
  start_line int NOT NULL,
  end_line int NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_chapter_version ON feedback_comments(chapter_version_id);

CREATE TABLE IF NOT EXISTS suggested_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_session_id uuid NOT NULL REFERENCES reader_sessions(id),
  chapter_version_id uuid NOT NULL REFERENCES chapter_versions(id),
  reader_profile_id uuid REFERENCES reader_profiles(id),
  reader_group_id uuid REFERENCES reader_groups(id),
  reader_invite_id uuid REFERENCES reader_invites(id),
  start_line int NOT NULL,
  end_line int NOT NULL,
  original_text text NOT NULL,
  suggested_text text NOT NULL,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suggested_edits_chapter_version ON suggested_edits(chapter_version_id);

CREATE TABLE IF NOT EXISTS interest_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES works(id),
  reader_session_id uuid REFERENCES reader_sessions(id),
  reader_profile_id uuid REFERENCES reader_profiles(id),
  reader_group_id uuid REFERENCES reader_groups(id),
  reader_invite_id uuid REFERENCES reader_invites(id),
  chapter_version_id uuid REFERENCES chapter_versions(id),
  email text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_id, email)
)
`;

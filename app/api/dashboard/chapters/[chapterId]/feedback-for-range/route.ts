import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { charRangeToWordRange } from '@/lib/db/wordPos';
import { resolveWordRange } from '@/lib/db/resolveWordRange';

export async function GET(req: NextRequest, { params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const { searchParams } = new URL(req.url);
  const chapterVersionId = searchParams.get('chapterVersionId');
  const charStart = parseInt(searchParams.get('charStart') ?? '');
  const charLength = parseInt(searchParams.get('charLength') ?? '');

  if (!chapterVersionId || isNaN(charStart) || isNaN(charLength)) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  // Get current version's rendered HTML to compute word range
  const [currentVer] = await sql`
    SELECT cv.id, cv.rendered_html, cv.version_number
    FROM chapter_versions cv
    WHERE cv.id = ${chapterVersionId}
  `;
  if (!currentVer) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

  const wordRange = charRangeToWordRange(currentVer.rendered_html as string, charStart, charLength);
  if (!wordRange) return NextResponse.json({ versions: [] });

  // Get all versions for this chapter, ordered newest first
  const allVersions = await sql`
    SELECT cv.id, cv.version_number, cv.rendered_html,
           dv.commit_sha, dv.commit_message, dv.commit_created_at as date
    FROM chapter_versions cv
    JOIN document_versions dv ON dv.id = cv.document_version_id
    JOIN chapters c ON c.id = cv.chapter_id
    WHERE c.id = ${chapterId}
    ORDER BY cv.version_number DESC
  `;

  // Get all diffs for this chapter (for resolveWordRange)
  const diffs = await sql`
    SELECT cd.chapter_version_id, cd.previous_chapter_version_id, cd.word_map
    FROM chapter_diffs cd
    JOIN chapter_versions cv ON cv.id = cd.chapter_version_id
    JOIN chapters c ON c.id = cv.chapter_id
    WHERE c.id = ${chapterId}
  `;

  const result = [];

  for (const ver of allVersions) {
    // Map the current version's word range to this version's word space
    let mapped: { wordStart: number; wordEnd: number } | null;

    if (ver.id === chapterVersionId) {
      mapped = wordRange;
    } else {
      // Resolve from current version to this version
      // Try forward (current → this) and backward (this → current)
      mapped = resolveWordRange(
        diffs as any[],
        chapterVersionId,
        ver.id as string,
        wordRange.wordStart,
        wordRange.wordEnd,
      );

      if (!mapped) {
        // Try reverse: resolve from this version to current, then check overlap
        // (for older versions that are ancestors of current)
        mapped = resolveWordRange(
          diffs as any[],
          ver.id as string,
          chapterVersionId,
          wordRange.wordStart,
          wordRange.wordEnd,
        );
        // If resolved forward (older → current) gives a range, the text exists in both
        // We need the word range in *this* version, not current. Skip if not resolvable forward.
        if (mapped) {
          // We resolved backwards to get current's range — not what we need.
          // Try looking for feedback in this version that overlaps with the char range
          // by using word positions stored directly in feedback
          mapped = null; // Will rely on word overlap below
        }
      }
    }

    // Query feedback for this version where word range overlaps
    const comments = await sql`
      SELECT fc.id, fc.body, fc.selected_text, fc.char_start, fc.char_length, fc.word_start, fc.word_end, fc.created_at,
             rp.display_name as reader_name, rp.slug as reader_slug
      FROM feedback_comments fc
      LEFT JOIN reader_profiles rp ON rp.id = fc.reader_profile_id
      WHERE fc.chapter_version_id = ${ver.id}
        AND fc.word_start IS NOT NULL AND fc.word_end IS NOT NULL
        AND fc.word_start <= ${mapped ? mapped.wordEnd : wordRange.wordEnd}
        AND fc.word_end >= ${mapped ? mapped.wordStart : wordRange.wordStart}
      ORDER BY fc.char_start NULLS LAST, fc.created_at
    `;

    const suggestions = await sql`
      SELECT se.id, se.original_text, se.suggested_text, se.rationale, se.char_start, se.char_length, se.word_start, se.word_end, se.created_at,
             rp.display_name as reader_name, rp.slug as reader_slug
      FROM suggested_edits se
      LEFT JOIN reader_profiles rp ON rp.id = se.reader_profile_id
      WHERE se.chapter_version_id = ${ver.id}
        AND se.word_start IS NOT NULL AND se.word_end IS NOT NULL
        AND se.word_start <= ${mapped ? mapped.wordEnd : wordRange.wordEnd}
        AND se.word_end >= ${mapped ? mapped.wordStart : wordRange.wordStart}
      ORDER BY se.char_start NULLS LAST, se.created_at
    `;

    if (comments.length > 0 || suggestions.length > 0) {
      result.push({
        versionId: ver.id,
        versionNumber: ver.version_number,
        commitSha: ver.commit_sha,
        commitMessage: ver.commit_message,
        date: ver.date,
        comments,
        suggestions,
      });
    }
  }

  return NextResponse.json({ versions: result });
}

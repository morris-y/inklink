import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { htmlToTextContent } from '../lib/db/charPos.js';
import { htmlToWords } from '../lib/db/wordPos.js';

function normalizeQuotes(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"');
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  const [latestVer] = await sql`
    SELECT cv.id, cv.rendered_html FROM chapter_versions cv
    JOIN chapters c ON c.id = cv.chapter_id
    JOIN document_versions dv ON dv.id = cv.document_version_id
    WHERE c.file_path = 'chapter-01.md'
    ORDER BY dv.deployed_at DESC LIMIT 1
  `;

  const words = htmlToWords(latestVer.rendered_html);
  const text = htmlToTextContent(latestVer.rendered_html);

  // Test bees' nest
  const needle1 = "Did you eat a bees' nest? Is this belly filled with cleverness and honey?";
  const normNeedle1 = normalizeQuotes(needle1);
  console.log('needle1:', JSON.stringify(normNeedle1));

  // Find "Did" word index
  const didIdx = words.findIndex(w => w === 'Did');
  console.log('"Did" word index:', didIdx);
  if (didIdx >= 0) {
    // Build joined from that index
    let joined = '';
    for (let j = didIdx; j < Math.min(didIdx + 20, words.length); j++) {
      joined = j === didIdx ? words[j] : joined + ' ' + words[j];
      const normJoined = normalizeQuotes(joined);
      console.log(`  j=${j} joined="${normJoined.slice(0, 50)}" len=${joined.length} match=${normJoined === normNeedle1}`);
      if (normJoined === normNeedle1) { console.log('  MATCH at j=', j); break; }
    }
  }

  console.log('');

  // Check what text is around "honey?" in the chapter
  const honeyIdx = text.indexOf('honey?');
  if (honeyIdx >= 0) {
    console.log('text around honey?:', JSON.stringify(text.slice(honeyIdx - 5, honeyIdx + 20)));
    const codes = [...text.slice(honeyIdx, honeyIdx + 10)].map((c, i) => `${i}:${c.codePointAt(0)}`).join(', ');
    console.log('char codes:', codes);
  }
}

main().catch(console.error);

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const chaptersDir = path.join(process.cwd(), 'chapters');

export interface MarkdownChapter {
  filePath: string;        // relative path like "chapter-01.md"
  slug: string;            // "chapter-01"
  title: string;
  sortOrder: number;
  rawMarkdown: string;
  frontmatter: Record<string, unknown>;
}

export function loadAllMarkdownChapters(): MarkdownChapter[] {
  let files: string[];
  try {
    files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md'));
  } catch {
    return [];
  }

  const chapters: MarkdownChapter[] = [];
  for (const file of files) {
    const fullPath = path.join(chaptersDir, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(raw);
    chapters.push({
      filePath: file,
      slug: file.replace(/\.md$/, ''),
      title: data.title || file.replace(/\.md$/, ''),
      sortOrder: data.order ?? 0,
      rawMarkdown: content,
      frontmatter: data,
    });
  }

  chapters.sort((a, b) => a.sortOrder - b.sortOrder);
  return chapters;
}

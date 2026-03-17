import { renderMarkdown } from '../content/render-markdown';
import { normalizeLines, countWords, NormalizedLine } from '../content/line-normalize';
import { MarkdownChapter } from '../content/load-markdown';

export interface ParsedChapter {
  slug: string;
  filePath: string;
  title: string;
  sortOrder: number;
  rawMarkdown: string;
  renderedHtml: string;
  lines: NormalizedLine[];
  lineCount: number;
  wordCount: number;
  charCount: number;
}

export function parseChapter(chapter: MarkdownChapter): ParsedChapter {
  const renderedHtml = renderMarkdown(chapter.rawMarkdown);
  const lines = normalizeLines(chapter.rawMarkdown);
  const wordCount = countWords(chapter.rawMarkdown);
  const charCount = chapter.rawMarkdown.length;

  return {
    slug: chapter.slug,
    filePath: chapter.filePath,
    title: chapter.title,
    sortOrder: chapter.sortOrder,
    rawMarkdown: chapter.rawMarkdown,
    renderedHtml,
    lines,
    lineCount: lines.length,
    wordCount,
    charCount,
  };
}

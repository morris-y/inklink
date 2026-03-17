import crypto from 'crypto';

export interface NormalizedLine {
  lineNumber: number;   // 1-based
  lineText: string;
  lineHash: string;
  blockType: string | null;
}

export function normalizeLines(markdown: string): NormalizedLine[] {
  const lines = markdown.split('\n');
  return lines.map((lineText, index) => {
    const lineNumber = index + 1;
    const lineHash = crypto.createHash('sha1').update(lineText).digest('hex').slice(0, 16);
    const blockType = detectBlockType(lineText);
    return { lineNumber, lineText, lineHash, blockType };
  });
}

function detectBlockType(line: string): string | null {
  if (/^#{1,6}\s/.test(line)) return 'heading';
  if (/^[-*+]\s/.test(line)) return 'list_item';
  if (/^\d+\.\s/.test(line)) return 'ordered_list_item';
  if (/^>\s/.test(line)) return 'blockquote';
  if (/^```/.test(line)) return 'code_fence';
  if (line.trim() === '') return 'blank';
  return 'paragraph';
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

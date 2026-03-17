import simpleGit from 'simple-git';

export interface LineDiff {
  type: 'added' | 'removed' | 'unchanged';
  lineNumber: number;
  text: string;
}

export interface DiffResult {
  addedLines: number;
  removedLines: number;
  changedLines: number;
  diffJson: LineDiff[];
}

export async function diffChapterVersions(
  filePath: string,
  fromCommit: string | null,
  toCommit: string,
): Promise<DiffResult> {
  if (!fromCommit) {
    return { addedLines: 0, removedLines: 0, changedLines: 0, diffJson: [] };
  }

  const git = simpleGit(process.cwd());
  try {
    const diff = await git.diff([`${fromCommit}..${toCommit}`, '--', filePath]);
    return parseDiff(diff);
  } catch {
    return { addedLines: 0, removedLines: 0, changedLines: 0, diffJson: [] };
  }
}

function parseDiff(diffOutput: string): DiffResult {
  const lines = diffOutput.split('\n');
  const diffJson: LineDiff[] = [];
  let addedLines = 0, removedLines = 0;
  let newLineNum = 0;

  for (const line of lines) {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff') || line.startsWith('index') || line.startsWith('@@') || line.startsWith('\\')) {
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/);
        if (match) newLineNum = parseInt(match[1], 10) - 1;
      }
      continue;
    }
    if (line.startsWith('+')) {
      addedLines++;
      newLineNum++;
      diffJson.push({ type: 'added', lineNumber: newLineNum, text: line.slice(1) });
    } else if (line.startsWith('-')) {
      removedLines++;
      diffJson.push({ type: 'removed', lineNumber: newLineNum, text: line.slice(1) });
    } else {
      newLineNum++;
      diffJson.push({ type: 'unchanged', lineNumber: newLineNum, text: line.slice(1) });
    }
  }

  return { addedLines, removedLines, changedLines: Math.min(addedLines, removedLines), diffJson };
}

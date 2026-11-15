// Group anchored reader feedback into passages by overlapping char ranges.
// Counts come from here, never from the model, so the numbers on a card are always exact.

export interface AnchoredFeedback {
  id: string;
  kind: 'comment' | 'suggestion' | 'dislike';
  charStart: number | null;
  charLength: number | null;
  reader: string | null; // reader name/slug or session id; used only for distinct counts
  text: string;          // what the model reads: comment body, "old → new (why)", or empty for dislikes
  quote: string | null;  // selected passage text
}

export interface FeedbackCluster {
  charStart: number;
  charEnd: number;
  itemIds: string[];        // comment/suggestion ids (dislikes are counted, not linkable cards)
  readerCount: number;
  comments: number;
  suggestions: number;
  dislikes: number;
  items: AnchoredFeedback[];
}

export function clusterFeedback(items: AnchoredFeedback[], minItems = 2): FeedbackCluster[] {
  const anchored = items
    .filter(i => i.charStart != null && i.charLength != null && i.charLength > 0)
    .sort((a, b) => a.charStart! - b.charStart!);

  const groups: AnchoredFeedback[][] = [];
  let end = -1;
  for (const item of anchored) {
    const s = item.charStart!, e = s + item.charLength!;
    if (groups.length && s < end) {
      groups[groups.length - 1].push(item);
      end = Math.max(end, e);
    } else {
      groups.push([item]);
      end = e;
    }
  }

  return groups
    .filter(g => g.length >= minItems)
    .map(g => ({
      charStart: g[0].charStart!,
      charEnd: Math.max(...g.map(i => i.charStart! + i.charLength!)),
      itemIds: g.filter(i => i.kind !== 'dislike').map(i => i.id),
      readerCount: new Set(g.map(i => i.reader ?? i.id)).size,
      comments: g.filter(i => i.kind === 'comment').length,
      suggestions: g.filter(i => i.kind === 'suggestion').length,
      dislikes: g.filter(i => i.kind === 'dislike').length,
      items: g,
    }));
}

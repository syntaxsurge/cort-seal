import "server-only";

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

export function selectRelevantExcerpt(
  fullText: string,
  query: string,
  options?: { maxChars?: number; maxParagraphs?: number }
): string {
  const maxChars = options?.maxChars ?? 3500;
  const maxParagraphs = options?.maxParagraphs ?? 4;

  const queryTokens = new Set(tokenize(query));
  const paragraphs = fullText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const scored = paragraphs
    .map((paragraph) => {
      const tokens = tokenize(paragraph);
      let hits = 0;
      for (const token of tokens) {
        if (queryTokens.has(token)) hits += 1;
      }
      const score = tokens.length ? hits / tokens.length : 0;
      return { paragraph, score };
    })
    .sort((a, b) => b.score - a.score);

  const selected: string[] = [];
  let used = 0;

  for (const item of scored) {
    if (item.score <= 0) break;
    if (selected.length >= maxParagraphs) break;

    const candidate = item.paragraph;
    const nextUsed = used + candidate.length + (selected.length ? 2 : 0);
    if (nextUsed > maxChars) continue;

    selected.push(candidate);
    used = nextUsed;
  }

  const excerpt = selected.length ? selected.join("\n\n") : fullText.slice(0, maxChars);
  return excerpt.slice(0, maxChars);
}


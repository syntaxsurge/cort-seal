import "server-only";

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function toFreqVector(tokens: string[]): Map<string, number> {
  const vector = new Map<string, number>();
  for (const token of tokens) {
    vector.set(token, (vector.get(token) ?? 0) + 1);
  }
  return vector;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let a2 = 0;
  let b2 = 0;

  for (const [, value] of a) a2 += value * value;
  for (const [, value] of b) b2 += value * value;

  for (const [token, av] of a) {
    const bv = b.get(token);
    if (bv) dot += av * bv;
  }

  const denom = Math.sqrt(a2) * Math.sqrt(b2);
  return denom === 0 ? 0 : dot / denom;
}

export function meanPairwiseCosineSimilarity(texts: string[]): number {
  if (texts.length < 2) return 1;

  const vectors = texts.map((text) => toFreqVector(tokenize(text)));

  let sum = 0;
  let count = 0;

  for (let i = 0; i < vectors.length; i += 1) {
    for (let j = i + 1; j < vectors.length; j += 1) {
      sum += cosineSimilarity(vectors[i]!, vectors[j]!);
      count += 1;
    }
  }

  return count ? sum / count : 0;
}


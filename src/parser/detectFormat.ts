import type { SourceFormat } from '../domain/event';

/**
 * Classify raw text into a coarse format. Tolerant by design: a file that is
 * mostly JSON lines is treated as `jsonl` even with junk lines mixed in, and
 * a pretty-printed array/object is recognised via a whole-text parse first.
 */
export function detectFormat(text: string): SourceFormat {
  const t = text.trim();
  if (!t) return 'empty';

  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      const v: unknown = JSON.parse(t);
      if (Array.isArray(v)) return 'json-array';
      if (v && typeof v === 'object') return 'json-object';
    } catch {
      // Not whole-text JSON; fall through to line-based detection.
    }
  }

  const lines = t
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const sample = lines.slice(0, 50);
  let jsonLines = 0;
  for (const line of sample) {
    if (line.startsWith('{') || line.startsWith('[')) {
      try {
        JSON.parse(line);
        jsonLines += 1;
      } catch {
        // not a JSON line
      }
    }
  }

  if (jsonLines >= 1 && jsonLines >= Math.ceil(sample.length * 0.5)) {
    return 'jsonl';
  }
  return 'plain-text';
}

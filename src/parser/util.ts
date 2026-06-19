/** Small, dependency-free helpers for probing untrusted JSON safely. */

export type Json = Record<string, unknown>;

export function isObject(x: unknown): x is Json {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** First defined string value across candidate keys. */
export function pickString(obj: Json, keys: readonly string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

export function getObject(obj: Json, key: string): Json | undefined {
  const v = obj[key];
  return isObject(v) ? v : undefined;
}

export function getArray(obj: Json, key: string): unknown[] | undefined {
  const v = obj[key];
  return Array.isArray(v) ? v : undefined;
}

const MAX_CONTENT = 20_000;
/** Recursion guard so a maliciously deep `content` tree cannot blow the stack. */
const MAX_DEPTH = 24;

/**
 * Flatten an arbitrary `content` value (string, array of blocks, or object)
 * into plain text. Never returns "[object Object]"; unknown shapes are
 * JSON-stringified and truncated. Bounded recursion depth. Output is always
 * safe to render as text.
 */
export function flattenContent(value: unknown, depth = 0): string {
  if (depth > MAX_DEPTH) return '[deeply nested content omitted]';
  let out: string;
  if (typeof value === 'string') {
    out = value;
  } else if (Array.isArray(value)) {
    out = value
      .map((block) => flattenBlock(block, depth + 1))
      .filter(Boolean)
      .join('\n');
  } else if (isObject(value)) {
    out = flattenBlock(value, depth + 1);
  } else if (value == null) {
    out = '';
  } else {
    out = String(value);
  }
  return truncate(out, MAX_CONTENT);
}

function flattenBlock(block: unknown, depth: number): string {
  if (depth > MAX_DEPTH) return '[deeply nested content omitted]';
  if (typeof block === 'string') return block;
  if (!isObject(block)) return block == null ? '' : String(block);
  // Common text-bearing blocks across Claude Code and generic logs.
  const text = pickString(block, ['text', 'content', 'message', 'value']);
  if (typeof block.content === 'string') return block.content;
  if (Array.isArray(block.content)) {
    return block.content
      .map((b) => flattenBlock(b, depth + 1))
      .filter(Boolean)
      .join('\n');
  }
  if (text) return text;
  const type = pickString(block, ['type']);
  if (type) {
    // e.g. an image / document block: name it rather than dumping bytes.
    return `[${type} block]`;
  }
  return safeStringify(block);
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '\n… (truncated)';
}

export function safeStringify(value: unknown): string {
  try {
    return truncate(JSON.stringify(value), MAX_CONTENT);
  } catch {
    return String(value);
  }
}

/** Byte size of a string under UTF-8 (matches what a saved file would weigh). */
export function byteLength(text: string): number {
  if (typeof Blob !== 'undefined') return new Blob([text]).size;
  // Fallback for non-DOM environments.
  return text.length;
}

/** First whitespace-delimited token of a command, lowercased (for retry match). */
export function firstToken(command?: string): string | undefined {
  if (!command) return undefined;
  const trimmed = command.trim();
  if (!trimmed) return undefined;
  const token = trimmed.split(/\s+/)[0];
  return token ? token.toLowerCase() : undefined;
}

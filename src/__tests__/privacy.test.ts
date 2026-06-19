import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('privacy: no network in app source (case 23)', () => {
  it('uses no fetch / XHR / sendBeacon / WebSocket / EventSource', () => {
    const files = walk('src');
    const banned = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|EventSource/;
    const offenders = files.filter((f) => banned.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('uses no dangerouslySetInnerHTML', () => {
    const files = walk('src');
    const offenders = files.filter((f) =>
      /dangerouslySetInnerHTML/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});

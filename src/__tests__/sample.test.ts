import { describe, it, expect } from 'vitest';
import { parseText, analyze } from '../parser';
import { SAMPLE_LOG } from '../sample/sampleLog';

describe('bundled sample (case 22)', () => {
  const r = parseText(SAMPLE_LOG, 'sample');
  const a = analyze(r.events, r.warnings);

  it('is valid JSONL that parses with zero warnings', () => {
    expect(r.meta.format).toBe('jsonl');
    expect(r.warnings).toHaveLength(0);
  });

  it('produces a populated, sensible analysis', () => {
    expect(r.events.length).toBeGreaterThan(20);
    expect(a.counts.userPrompts).toBe(1);
    expect(a.counts.toolCalls).toBe(10);
    expect(a.counts.failures).toBe(1);
    expect(a.counts.verifications).toBe(3);
    expect(a.counts.files).toBe(2);
    expect(a.files).toEqual([
      'src/components/Dashboard.tsx',
      'src/lib/exportCsv.ts',
    ]);
  });

  it('links Bash outcomes and detects one inferred retry', () => {
    const bash = a.toolUsage.find((t) => t.name === 'Bash');
    expect(bash).toMatchObject({ count: 3, ok: 2, error: 1 });
    expect(a.retries).toHaveLength(1);
  });

  it('records a real timestamp span without fabricating values', () => {
    expect(a.firstTimestamp).toBe('2026-05-12T09:00:00Z');
    expect(a.lastTimestamp).toBe('2026-05-12T09:01:31Z');
  });
});

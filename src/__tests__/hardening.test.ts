import { describe, it, expect } from 'vitest';
import { parseText } from '../parser';
import { flattenContent } from '../parser/util';

/** Build a `content` tree nested `n` levels deep. */
function deepContent(n: number): unknown {
  let node: unknown = 'leaf';
  for (let i = 0; i < n; i += 1) node = [{ type: 'text', content: node }];
  return node;
}

describe('deeply nested content (stack-safety + sibling survival)', () => {
  it('does not throw and bounds recursion in flattenContent', () => {
    expect(() => flattenContent(deepContent(5000))).not.toThrow();
    expect(flattenContent(deepContent(5000))).toContain('deeply nested');
  });

  it('keeps sibling JSONL records when one record is pathologically deep', () => {
    const deepRecord = {
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'd', content: deepContent(100) }],
      },
    };
    const text = [
      JSON.stringify({ role: 'user', content: 'first sibling' }),
      JSON.stringify(deepRecord),
      JSON.stringify({ role: 'user', content: 'last sibling' }),
    ].join('\n');

    expect(() => parseText(text)).not.toThrow();
    const r = parseText(text);
    expect(r.events.some((e) => e.content.includes('first sibling'))).toBe(true);
    expect(r.events.some((e) => e.content.includes('last sibling'))).toBe(true);
  });
});

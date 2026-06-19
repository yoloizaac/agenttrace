import { describe, it, expect } from 'vitest';
import { parseText, analyze } from '../parser';
import { buildMarkdown } from '../export/markdown';
import { SAMPLE_LOG } from '../sample/sampleLog';

describe('Markdown export (case 12)', () => {
  const r = parseText(SAMPLE_LOG, 'sample', 'sample-session.jsonl');
  const md = buildMarkdown(r, analyze(r.events, r.warnings));

  it('includes every required section', () => {
    expect(md).toContain('# AgentTrace report');
    expect(md).toContain('## Summary');
    expect(md).toContain('## Tool usage');
    expect(md).toContain('## Files touched');
    expect(md).toContain('## Failures');
    expect(md).toContain('## Verification actions');
    expect(md).toContain('## Timeline highlights');
  });

  it('reflects real parsed data, not placeholders', () => {
    expect(md).toContain('Bash');
    expect(md).toContain('src/lib/exportCsv.ts');
    expect(md).toContain('pull request #42'); // from a real tool_result in the sample
  });

  it('carries an explicit heuristic + privacy disclaimer', () => {
    expect(md.toLowerCase()).toContain('inferred');
    expect(md.toLowerCase()).toContain('no session data was uploaded');
  });

  it('escapes pipes so untrusted text cannot break the table', () => {
    const r2 = parseText(
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'a | b | c' } }),
    );
    const md2 = buildMarkdown(r2, analyze(r2.events, r2.warnings));
    expect(md2).toContain('a \\| b \\| c');
  });

  it('defangs markdown link syntax so untrusted content cannot become a live link', () => {
    const r3 = parseText(
      JSON.stringify({
        type: 'user',
        message: { role: 'user', content: '[click me](javascript:alert(1))' },
      }),
    );
    const md3 = buildMarkdown(r3, analyze(r3.events, r3.warnings));
    expect(md3).not.toContain('](javascript:');
  });
});

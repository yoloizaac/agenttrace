import type { AgentEvent, ParseResult } from '../domain/event';
import type { SessionAnalysis } from '../domain/analysis';

/**
 * Build a Markdown report string from a parse result and its analysis. Pure:
 * returns a string, performs no IO. The caller turns it into a download.
 */
export function buildMarkdown(
  result: ParseResult,
  analysis: SessionAnalysis,
): string {
  const { meta } = result;
  const c = analysis.counts;
  const lines: string[] = [];

  lines.push('# AgentTrace report');
  lines.push('');
  const sourceLabel =
    meta.fileName ?? (meta.source === 'sample' ? 'bundled sample' : 'pasted text');
  lines.push(
    `_Generated locally from **${sourceLabel}**. Detected format: \`${meta.format}\`. ` +
      `${meta.recordCount} record(s), ${result.events.length} event(s)._`,
  );
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total events: ${c.total}`);
  lines.push(`- User prompts: ${c.userPrompts}`);
  lines.push(`- Tool calls: ${c.toolCalls}`);
  lines.push(`- Detected failures: ${c.failures}`);
  lines.push(`- Verification actions (inferred): ${c.verifications}`);
  lines.push(`- Files touched: ${c.files}`);
  if (analysis.firstTimestamp || analysis.lastTimestamp) {
    lines.push(
      `- Time span: ${analysis.firstTimestamp ?? '?'} to ${analysis.lastTimestamp ?? '?'}`,
    );
  }
  lines.push('');

  lines.push('## Tool usage');
  lines.push('');
  if (analysis.toolUsage.length === 0) {
    lines.push('No tool calls detected.');
  } else {
    lines.push('| Tool | Uses | OK | Error | Unknown |');
    lines.push('| --- | ---: | ---: | ---: | ---: |');
    for (const t of analysis.toolUsage) {
      lines.push(
        `| ${cell(t.name)} | ${t.count} | ${t.ok} | ${t.error} | ${t.unknown} |`,
      );
    }
  }
  lines.push('');

  lines.push('## Files touched');
  lines.push('');
  if (analysis.files.length === 0) {
    lines.push('None detected.');
  } else {
    for (const f of analysis.files) lines.push(`- \`${cell(f)}\``);
  }
  lines.push('');

  lines.push('## Failures');
  lines.push('');
  if (analysis.failures.length === 0) {
    lines.push('No failures detected.');
  } else {
    for (const f of analysis.failures) {
      lines.push(`- **${cell(f.title)}**${ref(f)}: ${snippet(f.content)}`);
    }
  }
  lines.push('');

  lines.push('## Verification actions (inferred)');
  lines.push('');
  if (analysis.verifications.length === 0) {
    lines.push('None detected.');
  } else {
    for (const v of analysis.verifications) {
      lines.push(`- \`${cell(v.command ?? v.title)}\` (outcome: ${v.status})`);
    }
  }
  lines.push('');

  lines.push('## Possible retries / corrections (inferred)');
  lines.push('');
  if (analysis.retries.length === 0) {
    lines.push('None detected.');
  } else {
    for (const r of analysis.retries) lines.push(`- ${cell(r.note)}`);
  }
  lines.push('');

  lines.push('## Parsing warnings');
  lines.push('');
  if (analysis.warnings.length === 0) {
    lines.push('None.');
  } else {
    for (const w of analysis.warnings) {
      lines.push(`- (${w.severity}) ${cell(w.message)}`);
    }
  }
  lines.push('');

  lines.push('## Timeline highlights');
  lines.push('');
  const highlights = result.events.slice(0, 30);
  for (const e of highlights) {
    const ts = e.timestamp ? `${e.timestamp} ` : '';
    lines.push(`- ${ts}[${e.category}] ${cell(e.title)}: ${snippet(e.content)}`);
  }
  if (result.events.length > highlights.length) {
    lines.push(`- â€¦ and ${result.events.length - highlights.length} more events.`);
  }
  lines.push('');

  lines.push('---');
  lines.push(
    '_Heuristic disclaimer: "verification" and "retry / correction" are inferred ' +
      'from patterns in the log (command keywords and adjacency). They are best-effort ' +
      'observations, not guarantees, and may be wrong. All parsing happened locally in ' +
      'the browser; no session data was uploaded._',
  );
  lines.push('');

  return lines.join('\n');
}

/**
 * Make a value safe for a Markdown table cell / single line, and defang link
 * syntax so untrusted content cannot become a clickable `javascript:` link in
 * whatever viewer opens the exported report.
 */
function cell(s: string): string {
  return s
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .replace(/\]\(/g, '] (') // break [text](url) link syntax
    .trim();
}

function snippet(content: string, max = 160): string {
  const flat = content.replace(/\r?\n/g, ' ').trim();
  if (flat.length === 0) return '(no content)';
  return flat.length <= max ? cell(flat) : cell(flat.slice(0, max)) + 'â€¦';
}

function ref(e: AgentEvent): string {
  if (e.command) return ` (\`${cell(e.command)}\`)`;
  if (e.toolName) return ` (${cell(e.toolName)})`;
  return '';
}

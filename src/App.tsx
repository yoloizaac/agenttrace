import { useCallback, useMemo, useState } from 'react';
import type { AgentEvent, EventCategory, ParseResult } from './domain/event';
import { analyze, parseFile, parseText } from './parser';
import { RENDER_LIMIT } from './parser/constants';
import { buildMarkdown } from './export/markdown';
import { downloadText } from './export/download';
import { SAMPLE_FILENAME, SAMPLE_LOG } from './sample/sampleLog';
import { categoryLabel } from './components/labels';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { Overview } from './components/Overview';
import { ToolUsage } from './components/ToolUsage';
import { Insights } from './components/Insights';
import { Timeline } from './components/Timeline';
import { ExportBar } from './components/ExportBar';

function matchesQuery(e: AgentEvent, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    e.title.toLowerCase().includes(needle) ||
    e.content.toLowerCase().includes(needle) ||
    (e.command?.toLowerCase().includes(needle) ?? false) ||
    (e.filePath?.toLowerCase().includes(needle) ?? false) ||
    (e.toolName?.toLowerCase().includes(needle) ?? false) ||
    categoryLabel(e.category).toLowerCase().includes(needle)
  );
}

export default function App() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [active, setActive] = useState<Set<EventCategory>>(new Set());
  const [query, setQuery] = useState('');

  const resetFilters = useCallback(() => {
    setActive(new Set());
    setQuery('');
  }, []);

  const loadResult = useCallback(
    (r: ParseResult) => {
      setResult(r);
      setReadError(null);
      resetFilters();
    },
    [resetFilters],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setReadError(null);
      try {
        const r = await parseFile(file);
        loadResult(r);
      } catch (err) {
        setReadError(
          `Could not read "${file.name}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      } finally {
        setBusy(false);
      }
    },
    [loadResult],
  );

  const handlePasteText = useCallback(
    (text: string) => loadResult(parseText(text, 'paste')),
    [loadResult],
  );

  const handleSample = useCallback(
    () => loadResult(parseText(SAMPLE_LOG, 'sample', SAMPLE_FILENAME)),
    [loadResult],
  );

  const handleClear = useCallback(() => {
    setResult(null);
    setReadError(null);
    resetFilters();
  }, [resetFilters]);

  const analysis = useMemo(
    () => (result ? analyze(result.events, result.warnings) : null),
    [result],
  );

  const present = useMemo(() => {
    const set = new Set<EventCategory>();
    result?.events.forEach((e) => set.add(e.category));
    return set;
  }, [result]);

  const filtered = useMemo(() => {
    if (!result) return [];
    return result.events.filter(
      (e) =>
        (active.size === 0 || active.has(e.category)) && matchesQuery(e, query),
    );
  }, [result, active, query]);

  const toggleCategory = useCallback((c: EventCategory) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  const handleExport = useCallback(() => {
    if (!result || !analysis) return;
    downloadText('agenttrace-report.md', buildMarkdown(result, analysis));
  }, [result, analysis]);

  return (
    <div className="app">
      <Header />

      <InputPanel
        onFile={handleFile}
        onPasteText={handlePasteText}
        onSample={handleSample}
        onClear={handleClear}
        busy={busy}
        hasResult={result !== null}
      />

      {readError && (
        <section className="section" aria-live="polite">
          <p className="warn-item err">{readError}</p>
        </section>
      )}

      {!result ? (
        <section className="section">
          <div className="empty-state">
            <p>
              <strong>No session loaded yet.</strong>
            </p>
            <p>
              Click <strong>Load sample</strong> to see a full review instantly, or
              upload an exported <code>.jsonl</code> session (or paste raw text).
              Everything stays in your browser.
            </p>
          </div>
        </section>
      ) : (
        analysis && (
          <>
            <Overview counts={analysis.counts} />
            <ToolUsage tools={analysis.toolUsage} />
            <Insights analysis={analysis} />
            <Timeline
              events={filtered}
              totalCount={result.events.length}
              present={present}
              active={active}
              query={query}
              renderLimit={RENDER_LIMIT}
              onToggleCategory={toggleCategory}
              onQuery={setQuery}
              onResetFilters={resetFilters}
            />
            <ExportBar onExport={handleExport} disabled={result.events.length === 0} />
          </>
        )
      )}

      <p className="footer">
        AgentTrace runs entirely in your browser. No API key, no server, no
        analytics, no data leaves this page.
      </p>
    </div>
  );
}

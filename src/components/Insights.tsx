import type { SessionAnalysis } from '../domain/analysis';

interface Props {
  analysis: SessionAnalysis;
}

export function Insights({ analysis }: Props) {
  const { retries, verifications, warnings } = analysis;

  return (
    <section className="section" aria-label="Insights">
      <h2>Insights</h2>
      <p className="disclaimer">
        Heuristic observations. Retries and verification are <strong>inferred</strong>{' '}
        from command keywords and event adjacency, not stated facts in the log. They
        can be wrong; treat them as hints, not conclusions.
      </p>

      <div className="insight-group">
        <h3>Possible failure → retry sequences (inferred)</h3>
        {retries.length === 0 ? (
          <p className="hint">None detected.</p>
        ) : (
          <ul className="insight-list">
            {retries.map((r, i) => (
              <li key={`${r.failureEventId}-${r.retryEventId}-${i}`}>{r.note}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="insight-group">
        <h3>Likely verification actions (inferred)</h3>
        {verifications.length === 0 ? (
          <p className="hint">None detected.</p>
        ) : (
          <ul className="insight-list">
            {verifications.map((v) => (
              <li key={v.id}>
                <code>{v.command ?? v.title}</code>{' '}
                {v.status === 'error'
                  ? '— ran but reported a failure'
                  : v.status === 'ok'
                    ? '— reported success'
                    : '— outcome not linked'}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="insight-group">
        <h3>Parsing warnings</h3>
        {warnings.length === 0 ? (
          <p className="hint">None. Every record was understood or preserved.</p>
        ) : (
          <ul className="insight-list">
            {warnings.map((w, i) => (
              <li
                key={i}
                className={`warn-item${w.severity === 'error' ? ' err' : ''}`}
              >
                {w.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

import type { ToolUsage as ToolUsageRow } from '../domain/analysis';

interface Props {
  tools: ToolUsageRow[];
}

export function ToolUsage({ tools }: Props) {
  return (
    <section className="section" aria-label="Tool usage">
      <h2>Tool usage</h2>
      {tools.length === 0 ? (
        <p className="empty">No tool calls detected in this session.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Tool</th>
              <th scope="col" className="num">
                Uses
              </th>
              <th scope="col" className="num">
                OK
              </th>
              <th scope="col" className="num">
                Error
              </th>
              <th scope="col" className="num">
                Unknown
              </th>
            </tr>
          </thead>
          <tbody>
            {tools.map((t) => (
              <tr key={t.name}>
                <td className="toolname">{t.name}</td>
                <td className="num">{t.count}</td>
                <td className="num">
                  {t.ok > 0 ? <span className="pill ok">{t.ok}</span> : 0}
                </td>
                <td className="num">
                  {t.error > 0 ? <span className="pill err">{t.error}</span> : 0}
                </td>
                <td className="num">{t.unknown}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="hint">
        OK / Error are taken from each tool result&apos;s status where the log links
        a result to its call. &ldquo;Unknown&rdquo; means no linked outcome was found.
      </p>
    </section>
  );
}

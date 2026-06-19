import type { OverviewCounts } from '../domain/analysis';

interface Props {
  counts: OverviewCounts;
}

interface Tile {
  label: string;
  value: number;
  tone?: 'alert' | 'good';
}

export function Overview({ counts }: Props) {
  const tiles: Tile[] = [
    { label: 'Total events', value: counts.total },
    { label: 'User prompts', value: counts.userPrompts },
    { label: 'Tool calls', value: counts.toolCalls },
    {
      label: 'Detected failures',
      value: counts.failures,
      tone: counts.failures > 0 ? 'alert' : undefined,
    },
    {
      label: 'Verification events',
      value: counts.verifications,
      tone: counts.verifications > 0 ? 'good' : undefined,
    },
    { label: 'Files touched', value: counts.files },
  ];

  return (
    <section className="section" aria-label="Session overview">
      <h2>Session overview</h2>
      <div className="tiles">
        {tiles.map((t) => (
          <div key={t.label} className={`tile${t.tone ? ` ${t.tone}` : ''}`}>
            <div className="num">{t.value}</div>
            <div className="label">{t.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

interface Props {
  onExport: () => void;
  disabled: boolean;
}

export function ExportBar({ onExport, disabled }: Props) {
  return (
    <section className="section" aria-label="Export">
      <h2>Export</h2>
      <div className="export-row">
        <button type="button" className="primary" onClick={onExport} disabled={disabled}>
          Download Markdown report
        </button>
        <p className="hint">
          A self-contained <code>.md</code> summary (counts, tools, files, failures,
          verification, timeline highlights) generated in your browser.
        </p>
      </div>
    </section>
  );
}

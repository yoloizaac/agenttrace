import { useState, type ChangeEvent } from 'react';

interface Props {
  onFile: (file: File) => void;
  onPasteText: (text: string) => void;
  onSample: () => void;
  onClear: () => void;
  busy: boolean;
  hasResult: boolean;
}

export function InputPanel({
  onFile,
  onPasteText,
  onSample,
  onClear,
  busy,
  hasResult,
}: Props) {
  const [paste, setPaste] = useState('');

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    // Reset so the same file can be chosen again.
    e.target.value = '';
  }

  return (
    <section className="section" aria-label="Input">
      <h2>Load a session</h2>
      <div className="input-actions">
        <label className="filelabel">
          Upload .jsonl / .json / .txt
          <input
            type="file"
            accept=".jsonl,.json,.txt,application/json,text/plain"
            onChange={handleFileChange}
            disabled={busy}
          />
        </label>
        <button type="button" className="primary" onClick={onSample} disabled={busy}>
          Load sample
        </button>
        <button type="button" onClick={onClear} disabled={busy || !hasResult}>
          Clear
        </button>
      </div>

      <label className="sr-only" htmlFor="paste-area">
        Paste raw session text
      </label>
      <textarea
        id="paste-area"
        placeholder="…or paste raw session text (JSONL, a JSON array, or plain text) here"
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        disabled={busy}
      />
      <div className="input-actions">
        <button
          type="button"
          onClick={() => onPasteText(paste)}
          disabled={busy || paste.trim().length === 0}
        >
          Parse pasted text
        </button>
        <p className="hint">
          Everything is parsed locally in your browser. Max 25&nbsp;MB. Treat any
          log as untrusted: content is always shown as plain text.
        </p>
      </div>
    </section>
  );
}

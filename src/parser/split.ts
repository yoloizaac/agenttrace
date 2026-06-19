import type { ParseWarning, SourceFormat } from '../domain/event';
import { isObject } from './util';

export interface SplitResult {
  records: unknown[];
  warnings: ParseWarning[];
  /** Non-blank lines (jsonl) or element/record count (others). */
  recordCount: number;
}

/**
 * Break decoded text into raw records according to the detected format.
 * Malformed JSONL lines become warnings, never thrown errors, so a single bad
 * line cannot take down the whole parse. Line accounting is preserved so the
 * caller can reconcile consumed + warned against total lines.
 */
export function splitRecords(text: string, format: SourceFormat): SplitResult {
  const warnings: ParseWarning[] = [];

  switch (format) {
    case 'empty':
      warnings.push({ message: 'Input is empty.', severity: 'warning' });
      return { records: [], warnings, recordCount: 0 };

    case 'jsonl': {
      const records: unknown[] = [];
      const rawLines = text.split(/\r?\n/);
      let nonBlank = 0;
      rawLines.forEach((raw, i) => {
        const line = raw.trim();
        if (!line) return;
        nonBlank += 1;
        try {
          records.push(JSON.parse(line));
        } catch {
          warnings.push({
            line: i + 1,
            message: `Line ${i + 1} is not valid JSON; skipped.`,
            severity: 'warning',
          });
        }
      });
      return { records, warnings, recordCount: nonBlank };
    }

    case 'json-array': {
      try {
        const parsed: unknown = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return { records: parsed, warnings, recordCount: parsed.length };
        }
        warnings.push({
          message: 'Expected a JSON array but found another shape.',
          severity: 'warning',
        });
        return { records: [parsed], warnings, recordCount: 1 };
      } catch {
        warnings.push({
          message: 'Input looked like a JSON array but could not be parsed.',
          severity: 'error',
        });
        return { records: [], warnings, recordCount: 0 };
      }
    }

    case 'json-object': {
      try {
        const parsed: unknown = JSON.parse(text);
        // A single object might itself wrap an array of events under a key.
        if (isObject(parsed)) {
          const nested = findEventArray(parsed);
          if (nested) {
            warnings.push({
              message:
                'Found an events array nested inside the object and used it.',
              severity: 'warning',
            });
            return { records: nested, warnings, recordCount: nested.length };
          }
        }
        return { records: [parsed], warnings, recordCount: 1 };
      } catch {
        warnings.push({
          message: 'Input looked like a JSON object but could not be parsed.',
          severity: 'error',
        });
        return { records: [], warnings, recordCount: 0 };
      }
    }

    case 'plain-text':
    default:
      warnings.push({
        message:
          'Input was not structured JSON; treated as a single plain-text note.',
        severity: 'warning',
      });
      return {
        records: [{ __plainText: text }],
        warnings,
        recordCount: 1,
      };
  }
}

/** If an object holds an obvious events/messages/records array, return it. */
function findEventArray(obj: Record<string, unknown>): unknown[] | undefined {
  for (const key of ['events', 'messages', 'records', 'entries', 'logs']) {
    const v = obj[key];
    if (Array.isArray(v) && v.length > 0) return v;
  }
  return undefined;
}

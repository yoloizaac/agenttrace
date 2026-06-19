import type { InputSource, ParseResult, ParseWarning } from '../domain/event';
import { MAX_BYTES, SOFT_WARN_BYTES } from './constants';
import { detectFormat } from './detectFormat';
import { splitRecords } from './split';
import { normalizeRecord } from './normalize';
import { classifyAll } from './classify';
import { byteLength } from './util';

export { analyze } from './analyze';
export type { ParseResult } from '../domain/event';

/**
 * Parse raw text into the normalized event model. This is the single entry
 * point used by both the UI and the tests. It is pure, synchronous, and is
 * wrapped so that no malformed input can ever throw to the caller.
 */
export function parseText(
  text: string,
  source: InputSource = 'paste',
  fileName?: string,
): ParseResult {
  const sizeBytes = byteLength(text);

  if (sizeBytes > MAX_BYTES) {
    return {
      events: [],
      warnings: [
        {
          message: `Input is ${formatBytes(sizeBytes)}, over the ${formatBytes(
            MAX_BYTES,
          )} limit. Parsing was skipped to protect the browser. Split the log and try again.`,
          severity: 'error',
        },
      ],
      meta: {
        format: 'empty',
        source,
        sizeBytes,
        recordCount: 0,
        tooLarge: true,
        fileName,
      },
    };
  }

  try {
    const warnings: ParseWarning[] = [];
    if (sizeBytes > SOFT_WARN_BYTES) {
      warnings.push({
        message: `Large input (${formatBytes(
          sizeBytes,
        )}); parsing and rendering may be slow.`,
        severity: 'warning',
      });
    }

    const format = detectFormat(text);
    const split = splitRecords(text, format);
    warnings.push(...split.warnings);

    // Normalize each record in isolation: a record that somehow throws becomes
    // a single `unknown` event plus a warning, so one bad record can never wipe
    // its siblings (the same isolation split.ts already gives per JSON line).
    const events = classifyAll(
      split.records.flatMap((record, i) => {
        try {
          return normalizeRecord(record, i);
        } catch (err) {
          warnings.push({
            message: `Record ${i + 1} could not be normalized (${
              err instanceof Error ? err.message : String(err)
            }); it was preserved as an unknown event.`,
            severity: 'warning',
          });
          return [
            {
              id: `rec-err-${i}`,
              category: 'unknown' as const,
              role: 'unknown' as const,
              title: 'Unparsed record',
              content: '',
              status: 'unknown' as const,
              rawType: 'normalize-error',
              rawData: record,
            },
          ];
        }
      }),
    );

    // Honest signal: structured input that produced only `unknown` events is
    // almost certainly not an agent session. Say so rather than imply we
    // understood it. (Plain text already carries its own note.)
    if (
      format !== 'plain-text' &&
      events.length > 0 &&
      events.every((e) => e.category === 'unknown')
    ) {
      warnings.push({
        message:
          'No recognisable agent events were found. Records were preserved as "unknown" so nothing was lost, but this may not be an agent session log.',
        severity: 'warning',
      });
    }

    return {
      events,
      warnings,
      meta: {
        format,
        source,
        sizeBytes,
        recordCount: split.recordCount,
        tooLarge: false,
        fileName,
      },
    };
  } catch (err) {
    // Last-resort guard: the parser must never throw to the UI.
    return {
      events: [],
      warnings: [
        {
          message: `Unexpected parse error: ${
            err instanceof Error ? err.message : String(err)
          }. The input was kept but could not be analysed.`,
          severity: 'error',
        },
      ],
      meta: {
        format: 'plain-text',
        source,
        sizeBytes,
        recordCount: 0,
        tooLarge: false,
        fileName,
      },
    };
  }
}

/**
 * Parse a browser File. Checks size before reading so an oversized file is
 * never loaded into memory. Falls back to parseText for the decoded contents.
 */
export async function parseFile(file: File): Promise<ParseResult> {
  if (file.size > MAX_BYTES) {
    return {
      events: [],
      warnings: [
        {
          message: `"${file.name}" is ${formatBytes(
            file.size,
          )}, over the ${formatBytes(MAX_BYTES)} limit. It was not read.`,
          severity: 'error',
        },
      ],
      meta: {
        format: 'empty',
        source: 'file',
        sizeBytes: file.size,
        recordCount: 0,
        tooLarge: true,
        fileName: file.name,
      },
    };
  }
  const text = await file.text();
  return parseText(text, 'file', file.name);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

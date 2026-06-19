/**
 * The normalized event model. Every input format is reduced to a list of
 * `AgentEvent`s so the UI and analysis only ever deal with one shape.
 *
 * Design rule: the parser must not depend on one exact field layout. Anything
 * it cannot confidently interpret is kept as `category: 'unknown'` with its raw
 * data preserved, and any guessed classification is flagged `inferred`.
 */

export type EventCategory =
  | 'user_prompt'
  | 'assistant_message'
  | 'plan'
  | 'tool_call'
  | 'tool_result'
  | 'file_operation'
  | 'command'
  | 'error'
  | 'retry'
  | 'verification'
  | 'unknown';

export type EventRole = 'user' | 'assistant' | 'system' | 'tool' | 'unknown';

export type EventStatus = 'ok' | 'error' | 'unknown';

export interface AgentEvent {
  /** Stable, unique id (source uuid when available, otherwise positional). */
  id: string;
  /** ISO timestamp when the source provides one. Never fabricated. */
  timestamp?: string;
  category: EventCategory;
  role: EventRole;
  /** Short human-readable label for the timeline row. */
  title: string;
  /** Safe text body. Rendered through React escaping, never as HTML. */
  content: string;
  toolName?: string;
  command?: string;
  filePath?: string;
  status: EventStatus;
  /** True when category and/or status were guessed heuristically. */
  inferred?: boolean;
  /** Original record/block type, for transparency. */
  rawType?: string;
  /** Original record/block, kept so nothing is silently lost. */
  rawData?: unknown;
}

export type SourceFormat =
  | 'jsonl'
  | 'json-array'
  | 'json-object'
  | 'plain-text'
  | 'empty';

export type InputSource = 'file' | 'paste' | 'sample';

export interface ParseWarning {
  /** 1-based source line for JSONL issues, when known. */
  line?: number;
  message: string;
  severity: 'warning' | 'error';
}

export interface ParseMeta {
  format: SourceFormat;
  source: InputSource;
  sizeBytes: number;
  /** Non-blank source lines seen (JSONL) or record count (others). */
  recordCount: number;
  /** True when the input exceeded the hard size cap and was not parsed. */
  tooLarge: boolean;
  fileName?: string;
}

export interface ParseResult {
  events: AgentEvent[];
  warnings: ParseWarning[];
  meta: ParseMeta;
}

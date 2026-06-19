import type { AgentEvent, ParseWarning } from './event';

export interface OverviewCounts {
  total: number;
  userPrompts: number;
  assistantMessages: number;
  toolCalls: number;
  failures: number;
  verifications: number;
  files: number;
}

export interface ToolUsage {
  name: string;
  count: number;
  ok: number;
  error: number;
  unknown: number;
}

/**
 * A heuristic, inferred observation: a failed tool/command appears to be
 * followed by a similar one. Always presented as a guess, never as fact.
 */
export interface RetrySequence {
  failureEventId: string;
  retryEventId: string;
  toolName?: string;
  command?: string;
  note: string;
}

export interface SessionAnalysis {
  counts: OverviewCounts;
  toolUsage: ToolUsage[];
  files: string[];
  failures: AgentEvent[];
  verifications: AgentEvent[];
  retries: RetrySequence[];
  warnings: ParseWarning[];
  firstTimestamp?: string;
  lastTimestamp?: string;
}

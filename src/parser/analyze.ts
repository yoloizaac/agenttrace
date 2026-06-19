import type { AgentEvent, EventStatus, ParseWarning } from '../domain/event';
import type {
  OverviewCounts,
  RetrySequence,
  SessionAnalysis,
  ToolUsage,
} from '../domain/analysis';
import { firstToken, isObject } from './util';

/** How many later tool calls to scan when looking for a retry after a failure. */
const RETRY_WINDOW = 5;

/** Categories that represent the agent invoking a tool (any source format). */
const TOOL_INVOCATION: ReadonlySet<AgentEvent['category']> = new Set([
  'tool_call',
  'command',
  'file_operation',
  'verification',
  'plan',
]);

/**
 * Pure reductions over the normalized events. Produces the numbers and lists
 * the UI and the Markdown report display. No heuristic here is presented as
 * fact: retries are explicitly inferred and labelled as such.
 */
export function analyze(
  events: AgentEvent[],
  warnings: ParseWarning[],
): SessionAnalysis {
  // Map a tool_use's id to the status of its linked tool_result (if any).
  const outcomeById = buildOutcomeMap(events);

  const counts = countEvents(events);
  const toolUsage = computeToolUsage(events, outcomeById);
  const files = distinctFiles(events);
  const failures = events.filter((e) => e.status === 'error');
  // Verification cards carry their linked result outcome, not the tool call's
  // own (always-unknown) status, so "passed / failed" is accurate.
  const verifications = events
    .filter((e) => e.category === 'verification')
    .map((e) => ({ ...e, status: resolveOutcome(e, outcomeById) }));
  const retries = detectRetries(events, outcomeById);
  const { firstTimestamp, lastTimestamp } = timestampRange(events);

  return {
    counts,
    toolUsage,
    files,
    failures,
    verifications,
    retries,
    warnings,
    firstTimestamp,
    lastTimestamp,
  };
}

function readId(rawData: unknown, key: string): string | undefined {
  if (!isObject(rawData)) return undefined;
  const v = rawData[key];
  return typeof v === 'string' ? v : undefined;
}

function buildOutcomeMap(events: AgentEvent[]): Map<string, EventStatus> {
  const map = new Map<string, EventStatus>();
  for (const e of events) {
    if (e.rawType === 'tool_result') {
      const id = readId(e.rawData, 'tool_use_id');
      if (id) map.set(id, e.status);
    }
  }
  return map;
}

function resolveOutcome(
  e: AgentEvent,
  outcomeById: Map<string, EventStatus>,
): EventStatus {
  const id = readId(e.rawData, 'id');
  return (id && outcomeById.get(id)) || e.status;
}

function countEvents(events: AgentEvent[]): OverviewCounts {
  return {
    total: events.length,
    userPrompts: events.filter((e) => e.category === 'user_prompt').length,
    assistantMessages: events.filter((e) => e.category === 'assistant_message')
      .length,
    toolCalls: events.filter((e) => TOOL_INVOCATION.has(e.category)).length,
    failures: events.filter((e) => e.status === 'error').length,
    verifications: events.filter((e) => e.category === 'verification').length,
    files: distinctFiles(events).length,
  };
}

function computeToolUsage(
  events: AgentEvent[],
  outcomeById: Map<string, EventStatus>,
): ToolUsage[] {
  const byName = new Map<string, ToolUsage>();
  for (const e of events) {
    if (e.rawType !== 'tool_use') continue;
    const name = e.toolName ?? 'unknown';
    const usage =
      byName.get(name) ?? { name, count: 0, ok: 0, error: 0, unknown: 0 };
    usage.count += 1;
    const outcome = resolveOutcome(e, outcomeById);
    if (outcome === 'ok') usage.ok += 1;
    else if (outcome === 'error') usage.error += 1;
    else usage.unknown += 1;
    byName.set(name, usage);
  }
  return [...byName.values()].sort((a, b) => b.count - a.count);
}

function distinctFiles(events: AgentEvent[]): string[] {
  const set = new Set<string>();
  for (const e of events) {
    // Count only real file operations; a search tool's `path` (e.g. Grep over
    // "src") is a directory, not a file the agent touched.
    if (e.filePath && e.category === 'file_operation') set.add(e.filePath);
  }
  return [...set].sort();
}

/**
 * Inferred retry detection: a tool call whose result errored, followed within a
 * small window by another tool call using the same tool or the same leading
 * command token. Source events are never relabelled; this only produces notes.
 */
function detectRetries(
  events: AgentEvent[],
  outcomeById: Map<string, EventStatus>,
): RetrySequence[] {
  const calls = events.filter((e) => e.rawType === 'tool_use');
  const retries: RetrySequence[] = [];

  for (let i = 0; i < calls.length; i += 1) {
    const failed = calls[i];
    if (resolveOutcome(failed, outcomeById) !== 'error') continue;
    const failedToken = firstToken(failed.command);
    for (let j = i + 1; j < Math.min(i + 1 + RETRY_WINDOW, calls.length); j += 1) {
      const next = calls[j];
      const sameTool =
        failed.toolName !== undefined && failed.toolName === next.toolName;
      const sameCmd =
        failedToken !== undefined && failedToken === firstToken(next.command);
      if (sameTool || sameCmd) {
        retries.push({
          failureEventId: failed.id,
          retryEventId: next.id,
          toolName: next.toolName,
          command: next.command,
          note: sameCmd
            ? `A "${failedToken}" command failed, then a similar command ran shortly after.`
            : `A ${failed.toolName ?? 'tool'} call failed, then the same tool was used again shortly after.`,
        });
        break;
      }
    }
  }
  return retries;
}

function timestampRange(events: AgentEvent[]): {
  firstTimestamp?: string;
  lastTimestamp?: string;
} {
  const stamps = events
    .map((e) => e.timestamp)
    .filter((t): t is string => typeof t === 'string');
  if (stamps.length === 0) return {};
  const sorted = [...stamps].sort();
  return { firstTimestamp: sorted[0], lastTimestamp: sorted[sorted.length - 1] };
}

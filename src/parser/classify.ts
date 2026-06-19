import type { AgentEvent } from '../domain/event';
import { isCommandTool, isFileTool, looksLikeVerification } from './constants';

/**
 * Heuristic refinement pass over normalized events. Upgrades tool calls into
 * more specific categories (command / file_operation / plan) from the tool
 * name, and flags likely verification commands. Anything genuinely inferred is
 * marked `inferred: true` so the UI can label it honestly. Pure; never throws.
 */
export function classify(event: AgentEvent): AgentEvent {
  let ev = event;

  if (ev.rawType === 'tool_use' && ev.category === 'tool_call') {
    const name = ev.toolName;
    if (name === 'ExitPlanMode') {
      // Structural, not inferred: ExitPlanMode unambiguously carries a plan.
      ev = { ...ev, category: 'plan', title: 'Plan' };
    } else if (isFileTool(name)) {
      ev = {
        ...ev,
        category: 'file_operation',
        title: ev.filePath ? `File: ${ev.filePath}` : `File op: ${name}`,
      };
    } else if (isCommandTool(name)) {
      ev = { ...ev, category: 'command', title: 'Command' };
    }
  }

  // Verification is a guess based on the command text, so flag it inferred.
  if (ev.category === 'command' && looksLikeVerification(ev.command)) {
    ev = { ...ev, category: 'verification', inferred: true, title: 'Verification' };
  }

  return ev;
}

export function classifyAll(events: AgentEvent[]): AgentEvent[] {
  return events.map(classify);
}

import type { EventCategory } from '../domain/event';

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  user_prompt: 'User prompt',
  assistant_message: 'Assistant',
  plan: 'Plan',
  tool_call: 'Tool call',
  tool_result: 'Tool result',
  file_operation: 'File op',
  command: 'Command',
  error: 'Error',
  retry: 'Retry',
  verification: 'Verification',
  unknown: 'Unknown',
};

/** Stable display order for the filter chips. */
export const CATEGORY_ORDER: EventCategory[] = [
  'user_prompt',
  'assistant_message',
  'plan',
  'tool_call',
  'command',
  'file_operation',
  'tool_result',
  'verification',
  'error',
  'retry',
  'unknown',
];

export function categoryLabel(c: EventCategory): string {
  return CATEGORY_LABEL[c] ?? c;
}

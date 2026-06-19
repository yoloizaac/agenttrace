import type { AgentEvent, EventRole } from '../domain/event';
import { KEYS } from './constants';
import {
  flattenContent,
  getObject,
  isObject,
  pickString,
  safeStringify,
  type Json,
} from './util';

/**
 * Turn one raw record into zero or more normalized events. Probes for common
 * keys rather than assuming a fixed layout; anything unrecognised is preserved
 * as an `unknown` event with its raw data kept. Never throws.
 */
export function normalizeRecord(value: unknown, index: number): AgentEvent[] {
  // Plain-text sentinel produced by splitRecords for unstructured input.
  if (isObject(value) && typeof value.__plainText === 'string') {
    return [
      {
        id: `plain-${index}`,
        category: 'unknown',
        role: 'unknown',
        title: 'Plain-text note',
        content: flattenContent(value.__plainText),
        status: 'unknown',
        rawType: 'plain-text',
      },
    ];
  }

  if (!isObject(value)) {
    return [
      {
        id: `rec-${index}`,
        category: 'unknown',
        role: 'unknown',
        title: 'Unrecognised record',
        content: flattenContent(value),
        status: 'unknown',
        rawType: typeof value,
        rawData: value,
      },
    ];
  }

  const rec = value;
  const ts = pickString(rec, KEYS.timestamp);
  const recType = pickString(rec, KEYS.type);
  const uuid = pickString(rec, ['uuid', 'id', 'message_id']);
  const baseId = `${uuid ?? 'rec'}-${index}`;

  const message = getObject(rec, 'message');
  const roleStr =
    (message && pickString(message, KEYS.role)) ??
    pickString(rec, KEYS.role) ??
    recType;
  const role = toRole(roleStr);

  // 1) Claude-style message with array or string content.
  if (message) {
    const content = message['content'];
    if (Array.isArray(content)) {
      const events = content.map((block, bi) =>
        blockToEvent(block, `${baseId}-${bi}`, ts, role),
      );
      if (events.length > 0) return events;
    }
    if (typeof content === 'string') {
      return [messageEvent(baseId, ts, role, content, rec, recType)];
    }
  }

  // 2) Generic / flat records (non-Claude or top-level fields).
  return [flatRecordToEvent(rec, baseId, ts, role, recType)];
}

function blockToEvent(
  block: unknown,
  id: string,
  ts: string | undefined,
  role: EventRole,
): AgentEvent {
  const b: Json = isObject(block) ? block : {};
  const btype = pickString(b, ['type']) ?? 'unknown';

  switch (btype) {
    case 'text':
      return {
        id,
        timestamp: ts,
        category: role === 'user' ? 'user_prompt' : 'assistant_message',
        role,
        title: role === 'user' ? 'User message' : 'Assistant message',
        content: flattenContent(b.text ?? b.content),
        status: 'ok',
        rawType: 'text',
        rawData: block,
      };
    case 'thinking':
      return {
        id,
        timestamp: ts,
        category: 'assistant_message',
        role: 'assistant',
        title: 'Thinking',
        content: flattenContent(b.thinking ?? b.text ?? b.content),
        status: 'ok',
        rawType: 'thinking',
        rawData: block,
      };
    case 'tool_use': {
      const name = pickString(b, ['name']) ?? 'tool';
      const input = getObject(b, 'input');
      const command = input ? pickString(input, ['command', 'cmd']) : undefined;
      const filePath = input
        ? pickString(input, ['file_path', 'filePath', 'path', 'notebook_path'])
        : undefined;
      const planText = input ? pickString(input, ['plan']) : undefined;
      const body =
        planText ?? command ?? (input ? safeStringify(input) : '');
      return {
        id,
        timestamp: ts,
        category: 'tool_call',
        role: 'assistant',
        title: `Tool: ${name}`,
        content: flattenContent(body),
        toolName: name,
        command,
        filePath,
        status: 'unknown',
        rawType: 'tool_use',
        rawData: block,
      };
    }
    case 'tool_result': {
      const isErr = b.is_error === true;
      return {
        id,
        timestamp: ts,
        category: isErr ? 'error' : 'tool_result',
        role: 'tool',
        title: isErr ? 'Tool result (error)' : 'Tool result',
        content: flattenContent(b.content),
        status: isErr ? 'error' : 'ok',
        rawType: 'tool_result',
        rawData: block,
      };
    }
    default:
      return {
        id,
        timestamp: ts,
        category: 'unknown',
        role,
        title: `${btype} block`,
        content: flattenContent(b.text ?? b.content ?? block),
        status: 'unknown',
        rawType: btype,
        rawData: block,
      };
  }
}

function flatRecordToEvent(
  rec: Json,
  id: string,
  ts: string | undefined,
  role: EventRole,
  recType: string | undefined,
): AgentEvent {
  const errStr = pickString(rec, KEYS.error);
  const levelStr = pickString(rec, ['level', 'severity', 'status']);
  const isErrFlag =
    rec.is_error === true ||
    rec.error === true ||
    (levelStr !== undefined && levelStr.toLowerCase() === 'error');
  const toolName = pickString(rec, KEYS.tool);
  const command = pickString(rec, [
    'command',
    'cmd',
    'commandLine',
    'command_line',
  ]);
  const filePath = pickString(rec, KEYS.path);
  const contentStr = pickString(rec, KEYS.content);

  if (recType === 'summary') {
    return {
      id,
      timestamp: ts,
      category: 'unknown',
      role: 'unknown',
      title: 'Session summary',
      content: flattenContent(rec.summary ?? contentStr ?? ''),
      status: 'unknown',
      rawType: 'summary',
      rawData: rec,
    };
  }

  if (errStr !== undefined || isErrFlag) {
    return {
      id,
      timestamp: ts,
      category: 'error',
      role: role === 'unknown' ? 'system' : role,
      title: 'Error',
      content: flattenContent(errStr ?? contentStr ?? rec),
      status: 'error',
      toolName,
      command,
      filePath,
      rawType: recType ?? 'error',
      rawData: rec,
    };
  }

  if (command !== undefined || toolName !== undefined) {
    return {
      id,
      timestamp: ts,
      category: command !== undefined ? 'command' : 'tool_call',
      role: role === 'unknown' ? 'assistant' : role,
      title: toolName ? `Tool: ${toolName}` : 'Command',
      content: flattenContent(command ?? contentStr ?? ''),
      toolName,
      command,
      filePath,
      status: 'unknown',
      rawType: recType ?? (command !== undefined ? 'command' : 'tool_use'),
      rawData: rec,
    };
  }

  if (filePath !== undefined) {
    return {
      id,
      timestamp: ts,
      category: 'file_operation',
      role: role === 'unknown' ? 'assistant' : role,
      title: `File: ${filePath}`,
      content: flattenContent(contentStr ?? ''),
      filePath,
      status: 'unknown',
      rawType: recType ?? 'file_operation',
      rawData: rec,
    };
  }

  if (contentStr !== undefined) {
    return messageEvent(id, ts, role, contentStr, rec, recType);
  }

  // Valid JSON, but not a shape we recognise: keep it, do not invent meaning.
  return {
    id,
    timestamp: ts,
    category: 'unknown',
    role,
    title: recType ? `${recType} record` : 'Unrecognised record',
    content: safeStringify(rec),
    status: 'unknown',
    rawType: recType ?? 'unknown',
    rawData: rec,
  };
}

function messageEvent(
  id: string,
  ts: string | undefined,
  role: EventRole,
  contentStr: string,
  rec: unknown,
  recType: string | undefined,
): AgentEvent {
  const category =
    role === 'user'
      ? 'user_prompt'
      : role === 'assistant'
        ? 'assistant_message'
        : 'unknown';
  return {
    id,
    timestamp: ts,
    category,
    role,
    title: titleForRole(role),
    content: flattenContent(contentStr),
    status: 'ok',
    rawType: recType ?? 'message',
    rawData: rec,
  };
}

function toRole(value: string | undefined): EventRole {
  if (!value) return 'unknown';
  const r = value.toLowerCase();
  if (r === 'human' || r.includes('user')) return 'user';
  if (r === 'ai' || r === 'model' || r.includes('assistant')) return 'assistant';
  if (r.includes('system')) return 'system';
  if (r.includes('tool')) return 'tool';
  return 'unknown';
}

function titleForRole(role: EventRole): string {
  switch (role) {
    case 'user':
      return 'User message';
    case 'assistant':
      return 'Assistant message';
    case 'system':
      return 'System message';
    default:
      return 'Message';
  }
}

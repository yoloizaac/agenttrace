/** Hard cap: input larger than this is rejected unparsed (browser memory guard). */
export const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
/** Soft cap: above this we still parse but warn the user it may be slow. */
export const SOFT_WARN_BYTES = 10 * 1024 * 1024; // 10 MB

/** Max event cards rendered before the timeline shows a "showing N of M" notice. */
export const RENDER_LIMIT = 1500;

/** Tool names (case-insensitive) treated as shell/command execution. */
const COMMAND_TOOLS = [
  'bash',
  'shell',
  'sh',
  'powershell',
  'pwsh',
  'run',
  'runcommand',
  'run_command',
  'terminal',
  'command',
  'exec',
];

/** Tool names (case-insensitive) treated as file interactions. */
const FILE_TOOLS = [
  'read',
  'write',
  'edit',
  'multiedit',
  'multi_edit',
  'notebookedit',
  'notebook_edit',
  'create',
  'createfile',
  'delete',
  'deletefile',
  'move',
  'copy',
  'rename',
  'applypatch',
  'apply_patch',
  'str_replace',
  'str_replace_editor',
];

export function isCommandTool(name: string | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  if (COMMAND_TOOLS.includes(n)) return true;
  return /(^|_)(bash|shell|powershell|pwsh|terminal)(_|$)/.test(n);
}

export function isFileTool(name: string | undefined): boolean {
  if (!name) return false;
  return FILE_TOOLS.includes(name.toLowerCase());
}

/**
 * Heuristic: does a command look like it verifies the work (tests, lint,
 * type-check, build)? Matches are flagged `inferred` because intent is guessed.
 */
const VERIFICATION_RE =
  /(?:^|[\s&|;(])(?:vitest|jest|mocha|pytest|rspec|phpunit|ctest|(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|lint|build|typecheck|type-check)|eslint|tsc\b|prettier\s+--check|go\s+test|go\s+vet|cargo\s+(?:test|check|clippy|build)|mvn\s+(?:test|verify)|gradle\s+(?:test|check|build)|dotnet\s+test|make\s+(?:test|check)|pre-commit\s+run)\b/i;

export function looksLikeVerification(command: string | undefined): boolean {
  if (!command) return false;
  return VERIFICATION_RE.test(command);
}

/** Keys probed across formats — kept central so tolerance is documented in one place. */
export const KEYS = {
  type: ['type', 'event', 'kind', 'role_type'],
  role: ['role', 'sender', 'author'],
  timestamp: ['timestamp', 'time', 'ts', 'created_at', 'createdAt', 'date'],
  content: ['content', 'text', 'message', 'body', 'value'],
  tool: ['tool', 'tool_name', 'toolName', 'name'],
  command: ['command', 'cmd', 'commandLine', 'command_line', 'input'],
  path: ['file_path', 'filePath', 'path', 'file', 'filename'],
  error: ['error', 'err', 'exception', 'stderr'],
} as const;

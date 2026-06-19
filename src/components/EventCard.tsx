import type { AgentEvent } from '../domain/event';
import { categoryLabel } from './labels';

interface Props {
  event: AgentEvent;
  defaultOpen?: boolean;
}

export function EventCard({ event, defaultOpen = false }: Props) {
  const className = `event cat-${event.category} status-${event.status}`;
  return (
    <details className={className} open={defaultOpen}>
      <summary>
        <span className="cat-tag">{categoryLabel(event.category)}</span>
        <span className="event-title">{event.title}</span>
        {event.inferred && <span className="inferred-tag">inferred</span>}
        {event.timestamp && <span className="event-ts">{event.timestamp}</span>}
      </summary>
      <div className="event-body">
        {(event.toolName || event.command || event.filePath) && (
          <p className="event-meta">
            {event.toolName && <span>tool: {event.toolName} </span>}
            {event.command && <span>cmd: {event.command} </span>}
            {event.filePath && <span>file: {event.filePath}</span>}
          </p>
        )}
        {/* Content is rendered as plain text children — React escapes it, so
            untrusted log content can never become live HTML. */}
        <pre className="event-content">{event.content || '(no content)'}</pre>
      </div>
    </details>
  );
}

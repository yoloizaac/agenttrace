import type { AgentEvent, EventCategory } from '../domain/event';
import { CATEGORY_ORDER, categoryLabel } from './labels';
import { EventCard } from './EventCard';

interface Props {
  events: AgentEvent[];
  totalCount: number;
  present: Set<EventCategory>;
  active: Set<EventCategory>;
  query: string;
  renderLimit: number;
  onToggleCategory: (c: EventCategory) => void;
  onQuery: (q: string) => void;
  onResetFilters: () => void;
}

export function Timeline({
  events,
  totalCount,
  present,
  active,
  query,
  renderLimit,
  onToggleCategory,
  onQuery,
  onResetFilters,
}: Props) {
  const chips = CATEGORY_ORDER.filter((c) => present.has(c));
  const shown = events.slice(0, renderLimit);
  const filtersActive = active.size > 0 || query.trim().length > 0;

  return (
    <section className="section" aria-label="Timeline">
      <h2>Timeline</h2>

      <div className="filters">
        <div className="filter-row">
          <span className="filter-caption" id="timeline-filter-caption">
            Filter:
          </span>
          <div className="chips" role="group" aria-labelledby="timeline-filter-caption">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                aria-pressed={active.has(c)}
                onClick={() => onToggleCategory(c)}
              >
                {categoryLabel(c)}
              </button>
            ))}
            {filtersActive && (
              <button type="button" className="chip" onClick={onResetFilters}>
                <span aria-hidden="true">✕ </span>Reset
              </button>
            )}
          </div>
        </div>
        <div className="search">
          <label className="sr-only" htmlFor="timeline-search">
            Search timeline
          </label>
          <input
            id="timeline-search"
            type="search"
            placeholder="Search titles, content, commands, files…"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
      </div>

      <p className="count-note">
        Showing {shown.length} of {events.length} matching event(s)
        {events.length !== totalCount ? ` (filtered from ${totalCount})` : ''}.
        {events.length > shown.length &&
          ` Render is capped at ${renderLimit}; refine the filter to see the rest.`}
      </p>

      {shown.length === 0 ? (
        <p className="empty">No events match the current filter.</p>
      ) : (
        shown.map((e) => <EventCard key={e.id} event={e} />)
      )}
    </section>
  );
}

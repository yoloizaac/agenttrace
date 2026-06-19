import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { EventCard } from '../components/EventCard';
import type { AgentEvent } from '../domain/event';

function ev(partial: Partial<AgentEvent>): AgentEvent {
  return {
    id: 'e1',
    category: 'unknown',
    role: 'unknown',
    title: 'Event',
    content: '',
    status: 'unknown',
    ...partial,
  };
}

describe('App sample flow (case 22, UI)', () => {
  it('renders a populated dashboard one click after Load sample', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /load sample/i }));
    expect(screen.getByText(/session overview/i)).toBeInTheDocument();
    expect(screen.getByText('Total events')).toBeInTheDocument();
    expect(screen.getByText('Tool usage')).toBeInTheDocument();
    expect(screen.getAllByText('Bash').length).toBeGreaterThan(0);
  });

  it('starts on an empty state, not a blank screen', () => {
    render(<App />);
    expect(screen.getByText(/no session loaded yet/i)).toBeInTheDocument();
  });
});

describe('safe rendering (case 13, UI)', () => {
  it('shows script-like content as inert text, never a live element', () => {
    const payload = '<script>alert(1)</script>';
    const { container } = render(
      <EventCard event={ev({ content: payload })} defaultOpen />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText(payload)).toBeInTheDocument();
  });

  it('does not interpret HTML tags in content', () => {
    const { container } = render(
      <EventCard event={ev({ content: '<b>bold?</b>' })} defaultOpen />,
    );
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<b>bold?</b>');
  });
});

describe('timeline filtering and search', () => {
  it('filters the timeline by search text', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /load sample/i }));
    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'mcp__github' } });
    expect(screen.getByText(/Showing 1 of 1 matching/i)).toBeInTheDocument();
  });
});

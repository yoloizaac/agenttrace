import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

/**
 * Runtime proof of the privacy claim: drive the whole app (load sample, search,
 * filter, export) while trapping every network primitive, and assert none fire.
 * This complements privacy.test.ts, which only greps the source.
 */
describe('runtime: no network egress during real use (case 23)', () => {
  it('never calls fetch / XHR / sendBeacon / WebSocket', () => {
    const calls: string[] = [];

    const origFetch = globalThis.fetch;
    const origOpen = XMLHttpRequest.prototype.open;
    const origBeacon = navigator.sendBeacon;
    const origWS = (globalThis as { WebSocket?: unknown }).WebSocket;
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;

    // Stub the download blob plumbing (jsdom has no real object URLs).
    URL.createObjectURL = () => 'blob:mock';
    URL.revokeObjectURL = () => undefined;

    globalThis.fetch = (() => {
      calls.push('fetch');
      return Promise.reject(new Error('blocked'));
    }) as typeof fetch;
    XMLHttpRequest.prototype.open = function patched(this: XMLHttpRequest) {
      calls.push('xhr');
    } as XMLHttpRequest['open'];
    (navigator as { sendBeacon?: unknown }).sendBeacon = () => {
      calls.push('beacon');
      return true;
    };
    (globalThis as { WebSocket?: unknown }).WebSocket = function patchedWS() {
      calls.push('websocket');
    };

    try {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /load sample/i }));
      fireEvent.change(screen.getByRole('searchbox'), {
        target: { value: 'csv' },
      });
      fireEvent.click(screen.getByRole('button', { name: /download markdown/i }));
      expect(calls).toEqual([]);
    } finally {
      globalThis.fetch = origFetch;
      XMLHttpRequest.prototype.open = origOpen;
      (navigator as { sendBeacon?: unknown }).sendBeacon = origBeacon;
      (globalThis as { WebSocket?: unknown }).WebSocket = origWS;
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });
});

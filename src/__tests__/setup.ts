import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// We run Vitest without injected globals, so register cleanup explicitly to
// unmount React trees between tests.
afterEach(() => {
  cleanup();
});

// The bundled sample is the real .jsonl file under examples/, imported as a
// string at build time (Vite `?raw`). Keeping one source of truth means the
// "Load sample" button and the downloadable example file can never drift apart,
// and nothing is fetched over the network.
import raw from '../../examples/sample-session.jsonl?raw';

export const SAMPLE_LOG: string = raw;
export const SAMPLE_FILENAME = 'sample-session.jsonl';

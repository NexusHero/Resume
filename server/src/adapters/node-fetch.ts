import type { HttpFetch } from '../ports/http-fetch.js';

/** Production HttpFetch: a thin wrapper over Node's global fetch (Node >= 24). */
export const nodeFetch: HttpFetch = (url, init) => fetch(url, init);

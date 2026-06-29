import type { HttpFetch } from '../ports/http-fetch';

/** Production HttpFetch: a thin wrapper over Node's global fetch (Node >= 24). */
export const nodeFetch: HttpFetch = (url, init) => fetch(url, init);

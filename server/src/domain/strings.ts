/**
 * Small string helpers that avoid regular expressions with super-linear
 * backtracking (e.g. `/\/+$/`), which static analysis flags as ReDoS-prone.
 */

/** Strip every trailing occurrence of `ch` (a single character). */
export function trimEndChar(value: string, ch: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === ch) end--;
  return value.slice(0, end);
}

/** Strip every leading occurrence of `ch` (a single character). */
export function trimStartChar(value: string, ch: string): string {
  let start = 0;
  while (start < value.length && value[start] === ch) start++;
  return value.slice(start);
}

/** Strip leading and trailing occurrences of `ch` (a single character). */
export function trimChar(value: string, ch: string): string {
  return trimStartChar(trimEndChar(value, ch), ch);
}

/** `https://x.test///` → `https://x.test` */
export function stripTrailingSlashes(value: string): string {
  return trimEndChar(value, '/');
}

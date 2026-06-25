/** Versions changes to the data store (e.g. a git commit), returning a short ref. */
export interface Versioner {
  /** Commit the store's tracked files; resolves to a short hash, or null if nothing was versioned. */
  commit(message: string): Promise<string | null>;
}

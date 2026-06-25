/** Generates unique application identifiers. */
export interface IdGenerator {
  next(): string;
}

import type { IdGenerator } from '../ports/id-generator.js';

/** Time-plus-randomness identifier, base36 encoded (collision-resistant enough for a personal store). */
export class RandomIdGenerator implements IdGenerator {
  next(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }
}

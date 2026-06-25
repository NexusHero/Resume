import pino from 'pino';
import type { Logger } from '../ports/logger';

/** Production logger backed by pino. */
export function createLogger(env: NodeJS.ProcessEnv = process.env): Logger {
  return pino({ level: env.LOG_LEVEL ?? 'info' }) as unknown as Logger;
}

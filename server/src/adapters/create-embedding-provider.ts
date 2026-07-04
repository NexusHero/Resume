import { HashedEmbeddingProvider } from './hashed-embedding-provider.js';
import { OllamaEmbeddingProvider } from './ollama-embedding-provider.js';
import { OpenAiEmbeddingProvider } from './openai-embedding-provider.js';
import type { EmbeddingConfig } from '../config.js';
import type { EmbeddingProvider } from '../ports/embedding-provider.js';
import type { HttpFetch } from '../ports/http-fetch.js';
import type { Logger } from '../ports/logger.js';

/**
 * Select the embedding backend from config (ADR-0020). The default is the
 * offline hashed provider; `ollama` (local, first-party) and `openai`
 * (third-party API) are opt-in and each degrade to hashed on any error. If
 * `openai` is chosen without a key it stays hashed rather than 401 on every
 * ranking.
 */
export function createEmbeddingProvider(deps: {
  config: EmbeddingConfig;
  logger: Logger;
  httpFetch: HttpFetch;
}): EmbeddingProvider {
  const { config, logger, httpFetch } = deps;
  const hashed = new HashedEmbeddingProvider();

  if (config.provider === 'ollama') {
    logger.info(
      { url: config.ollama.url, model: config.ollama.model },
      'embeddings: using Ollama (local neural, hashed fallback)',
    );
    return new OllamaEmbeddingProvider({
      httpFetch,
      fallback: hashed,
      logger,
      config: { ...config.ollama, timeoutMs: config.timeoutMs },
    });
  }

  if (config.provider === 'openai') {
    if (!config.openai.apiKey) {
      logger.warn(
        'embeddings: EMBEDDING_PROVIDER=openai but OPENAI_API_KEY is unset — using hashed',
      );
      return hashed;
    }
    logger.info(
      { model: config.openai.model },
      'embeddings: using OpenAI (third-party API, hashed fallback)',
    );
    return new OpenAiEmbeddingProvider({
      httpFetch,
      fallback: hashed,
      logger,
      config: { ...config.openai, timeoutMs: config.timeoutMs },
    });
  }

  return hashed;
}

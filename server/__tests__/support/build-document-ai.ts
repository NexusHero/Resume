import { DocumentAiService } from '../../src/services/document-ai-service.js';
import { LlmFeatureRunner } from '../../src/services/llm-feature-runner.js';
import { DocumentAssistService } from '../../src/services/document-assist-service.js';
import { CvParseService } from '../../src/services/cv-parse-service.js';
import { AtsAiService } from '../../src/services/ats-ai-service.js';
import { OutreachAiService } from '../../src/services/outreach-ai-service.js';
import { MatchAiService } from '../../src/services/match-ai-service.js';
import type { DocumentService } from '../../src/services/document-service.js';
import type { LlmService } from '../../src/services/llm-service.js';
import type { ApiKeyStore } from '../../src/ports/api-key-store.js';
import type { UserRepository } from '../../src/ports/user-repository.js';
import type { PdfTextExtractor } from '../../src/ports/pdf-text-extractor.js';
import type { UsageMeter } from '../../src/ports/usage-meter.js';
import type { InterviewObservationRepository } from '../../src/ports/interview-observation-repository.js';
import type { ArtifactLogRepository } from '../../src/ports/artifact-log-repository.js';
import type { IdGenerator } from '../../src/ports/id-generator.js';
import type { Clock } from '../../src/ports/clock.js';
import type { Logger } from '../../src/ports/logger.js';

/**
 * Assemble the DocumentAiService facade from its leaf dependencies (ADR-0022) —
 * the same set the single service used to take. Lets tests keep one construction
 * call while the implementation lives in the runner + five feature services.
 */
export function buildDocumentAiService(deps: {
  documentService: DocumentService;
  llmService: LlmService;
  apiKeyStore: ApiKeyStore;
  userRepository: UserRepository;
  pdfTextExtractor: PdfTextExtractor;
  usageMeter: UsageMeter;
  interviewObservationRepository: InterviewObservationRepository;
  artifactLogRepository: ArtifactLogRepository;
  idGenerator: IdGenerator;
  clock: Clock;
  logger: Logger;
}): DocumentAiService {
  const runner = new LlmFeatureRunner({
    llmService: deps.llmService,
    apiKeyStore: deps.apiKeyStore,
    userRepository: deps.userRepository,
    usageMeter: deps.usageMeter,
    clock: deps.clock,
    logger: deps.logger,
  });
  return new DocumentAiService({
    documentAssistService: new DocumentAssistService({
      llmFeatureRunner: runner,
      documentService: deps.documentService,
      clock: deps.clock,
    }),
    cvParseService: new CvParseService({
      llmFeatureRunner: runner,
      documentService: deps.documentService,
      pdfTextExtractor: deps.pdfTextExtractor,
      logger: deps.logger,
    }),
    atsAiService: new AtsAiService({
      llmFeatureRunner: runner,
      documentService: deps.documentService,
    }),
    outreachAiService: new OutreachAiService({
      llmFeatureRunner: runner,
      documentService: deps.documentService,
      artifactLogRepository: deps.artifactLogRepository,
      idGenerator: deps.idGenerator,
      clock: deps.clock,
      logger: deps.logger,
    }),
    matchAiService: new MatchAiService({
      llmFeatureRunner: runner,
      documentService: deps.documentService,
      interviewObservationRepository: deps.interviewObservationRepository,
    }),
  });
}

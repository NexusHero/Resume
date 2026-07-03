import { DocumentAiService } from '../../src/services/document-ai-service';
import { LlmFeatureRunner } from '../../src/services/llm-feature-runner';
import { DocumentAssistService } from '../../src/services/document-assist-service';
import { CvParseService } from '../../src/services/cv-parse-service';
import { AtsAiService } from '../../src/services/ats-ai-service';
import { OutreachAiService } from '../../src/services/outreach-ai-service';
import { MatchAiService } from '../../src/services/match-ai-service';
import type { DocumentService } from '../../src/services/document-service';
import type { LlmService } from '../../src/services/llm-service';
import type { ApiKeyStore } from '../../src/ports/api-key-store';
import type { UserRepository } from '../../src/ports/user-repository';
import type { PdfTextExtractor } from '../../src/ports/pdf-text-extractor';
import type { UsageMeter } from '../../src/ports/usage-meter';
import type { InterviewObservationRepository } from '../../src/ports/interview-observation-repository';
import type { ArtifactLogRepository } from '../../src/ports/artifact-log-repository';
import type { IdGenerator } from '../../src/ports/id-generator';
import type { Clock } from '../../src/ports/clock';
import type { Logger } from '../../src/ports/logger';

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

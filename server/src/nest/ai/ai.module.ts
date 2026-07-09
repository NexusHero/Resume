import { Global, Module } from '@nestjs/common';
import { LlmFeatureRunner } from '../../services/llm-feature-runner.js';
import { DocumentAssistService } from '../../services/document-assist-service.js';
import { CvParseService } from '../../services/cv-parse-service.js';
import { AtsAiService } from '../../services/ats-ai-service.js';
import { OutreachAiService } from '../../services/outreach-ai-service.js';
import { MatchAiService } from '../../services/match-ai-service.js';
import { DocumentAiService } from '../../services/document-ai-service.js';
import { CoverLetterService } from '../../services/cover-letter-service.js';
import type { LlmService } from '../../services/llm-service.js';
import type { DocumentService } from '../../services/document-service.js';
import type { ApiKeyStore } from '../../ports/api-key-store.js';
import type { UserRepository } from '../../ports/user-repository.js';
import type { UsageMeter } from '../../ports/usage-meter.js';
import type { PdfTextExtractor } from '../../ports/pdf-text-extractor.js';
import type { ArtifactLogRepository } from '../../ports/artifact-log-repository.js';
import type { InterviewObservationRepository } from '../../ports/interview-observation-repository.js';
import type { Clock } from '../../ports/clock.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import type { Logger } from '../../ports/logger.js';
import type { CandidateIdentity } from '../../domain/cover-letter.js';
import { DocumentsModule } from '../documents/documents.module.js';
import {
  LLM_FEATURE_RUNNER,
  DOCUMENT_ASSIST_SERVICE,
  CV_PARSE_SERVICE,
  ATS_AI_SERVICE,
  OUTREACH_AI_SERVICE,
  MATCH_AI_SERVICE,
  DOCUMENT_AI_SERVICE,
  COVER_LETTER_SERVICE,
  LLM_SERVICE,
  DOCUMENT_SERVICE,
  API_KEY_STORE,
  USER_REPOSITORY,
  USAGE_METER,
  PDF_TEXT_EXTRACTOR,
  ARTIFACT_LOG_REPOSITORY,
  INTERVIEW_OBSERVATION_REPOSITORY,
  CANDIDATE,
  CLOCK,
  ID_GENERATOR,
  LOGGER,
} from '../tokens.js';

/**
 * AI feature services (ADR-0051, ADR-0022) — the LlmFeatureRunner and the five
 * feature services behind it, the DocumentAiService facade over them, and the
 * CoverLetterService. `@Global` so the AI-backed controllers (documents-AI, llm,
 * match-ai, compliance, mail, cover-letter) can inject the facade. Imports
 * DocumentsModule for the shared DocumentService the features read/write.
 */
@Global()
@Module({
  imports: [DocumentsModule],
  providers: [
    {
      provide: LLM_FEATURE_RUNNER,
      useFactory: (
        llmService: LlmService,
        apiKeyStore: ApiKeyStore,
        userRepository: UserRepository,
        usageMeter: UsageMeter,
        clock: Clock,
        logger: Logger,
      ) =>
        new LlmFeatureRunner({
          llmService,
          apiKeyStore,
          userRepository,
          usageMeter,
          clock,
          logger,
        }),
      inject: [LLM_SERVICE, API_KEY_STORE, USER_REPOSITORY, USAGE_METER, CLOCK, LOGGER],
    },
    {
      provide: DOCUMENT_ASSIST_SERVICE,
      useFactory: (
        llmFeatureRunner: LlmFeatureRunner,
        documentService: DocumentService,
        clock: Clock,
      ) => new DocumentAssistService({ llmFeatureRunner, documentService, clock }),
      inject: [LLM_FEATURE_RUNNER, DOCUMENT_SERVICE, CLOCK],
    },
    {
      provide: CV_PARSE_SERVICE,
      useFactory: (
        llmFeatureRunner: LlmFeatureRunner,
        documentService: DocumentService,
        pdfTextExtractor: PdfTextExtractor,
        logger: Logger,
      ) => new CvParseService({ llmFeatureRunner, documentService, pdfTextExtractor, logger }),
      inject: [LLM_FEATURE_RUNNER, DOCUMENT_SERVICE, PDF_TEXT_EXTRACTOR, LOGGER],
    },
    {
      provide: ATS_AI_SERVICE,
      useFactory: (llmFeatureRunner: LlmFeatureRunner, documentService: DocumentService) =>
        new AtsAiService({ llmFeatureRunner, documentService }),
      inject: [LLM_FEATURE_RUNNER, DOCUMENT_SERVICE],
    },
    {
      provide: OUTREACH_AI_SERVICE,
      useFactory: (
        llmFeatureRunner: LlmFeatureRunner,
        documentService: DocumentService,
        artifactLogRepository: ArtifactLogRepository,
        idGenerator: IdGenerator,
        clock: Clock,
        logger: Logger,
      ) =>
        new OutreachAiService({
          llmFeatureRunner,
          documentService,
          artifactLogRepository,
          idGenerator,
          clock,
          logger,
        }),
      inject: [
        LLM_FEATURE_RUNNER,
        DOCUMENT_SERVICE,
        ARTIFACT_LOG_REPOSITORY,
        ID_GENERATOR,
        CLOCK,
        LOGGER,
      ],
    },
    {
      provide: MATCH_AI_SERVICE,
      useFactory: (
        llmFeatureRunner: LlmFeatureRunner,
        documentService: DocumentService,
        interviewObservationRepository: InterviewObservationRepository,
      ) =>
        new MatchAiService({ llmFeatureRunner, documentService, interviewObservationRepository }),
      inject: [LLM_FEATURE_RUNNER, DOCUMENT_SERVICE, INTERVIEW_OBSERVATION_REPOSITORY],
    },
    {
      provide: DOCUMENT_AI_SERVICE,
      useFactory: (
        documentAssistService: DocumentAssistService,
        cvParseService: CvParseService,
        atsAiService: AtsAiService,
        outreachAiService: OutreachAiService,
        matchAiService: MatchAiService,
      ) =>
        new DocumentAiService({
          documentAssistService,
          cvParseService,
          atsAiService,
          outreachAiService,
          matchAiService,
        }),
      inject: [
        DOCUMENT_ASSIST_SERVICE,
        CV_PARSE_SERVICE,
        ATS_AI_SERVICE,
        OUTREACH_AI_SERVICE,
        MATCH_AI_SERVICE,
      ],
    },
    {
      provide: COVER_LETTER_SERVICE,
      useFactory: (
        llmService: LlmService,
        candidate: CandidateIdentity,
        usageMeter: UsageMeter,
        clock: Clock,
        logger: Logger,
      ) => new CoverLetterService({ llmService, candidate, usageMeter, clock, logger }),
      inject: [LLM_SERVICE, CANDIDATE, USAGE_METER, CLOCK, LOGGER],
    },
  ],
  exports: [
    LLM_FEATURE_RUNNER,
    DOCUMENT_ASSIST_SERVICE,
    CV_PARSE_SERVICE,
    ATS_AI_SERVICE,
    OUTREACH_AI_SERVICE,
    MATCH_AI_SERVICE,
    DOCUMENT_AI_SERVICE,
    COVER_LETTER_SERVICE,
  ],
})
export class AiModule {}

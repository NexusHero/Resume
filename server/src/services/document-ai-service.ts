import type { DocumentAssistService } from './document-assist-service.js';
import type { CvParseService } from './cv-parse-service.js';
import type { AtsAiService } from './ats-ai-service.js';
import type { OutreachAiService } from './outreach-ai-service.js';
import type { MatchAiService } from './match-ai-service.js';

// Result types keep their old import path so callers are unaffected by the split.
export type { DocumentAiSuggestion } from './document-assist-service.js';
export type { ParsedDocument, ParsedPdfDocument } from './cv-parse-service.js';

export interface DocumentAiServiceDeps {
  documentAssistService: DocumentAssistService;
  cvParseService: CvParseService;
  atsAiService: AtsAiService;
  outreachAiService: OutreachAiService;
  matchAiService: MatchAiService;
}

/**
 * Facade over the split AI feature services (ADR-0022). It exists only so the
 * existing callers keep one entry point while the actual work lives in five
 * single-concern services behind the shared {@link LlmFeatureRunner}. It holds
 * no logic — every method delegates. Callers may depend on the specific service
 * directly instead; this facade can then be retired.
 */
export class DocumentAiService {
  private readonly assist: DocumentAssistService;
  private readonly parseSvc: CvParseService;
  private readonly ats: AtsAiService;
  private readonly outreachSvc: OutreachAiService;
  private readonly matchAi: MatchAiService;

  constructor(deps: DocumentAiServiceDeps) {
    this.assist = deps.documentAssistService;
    this.parseSvc = deps.cvParseService;
    this.ats = deps.atsAiService;
    this.outreachSvc = deps.outreachAiService;
    this.matchAi = deps.matchAiService;
  }

  suggest(...a: Parameters<DocumentAssistService['suggest']>) {
    return this.assist.suggest(...a);
  }
  tailorForMandate(...a: Parameters<DocumentAssistService['tailorForMandate']>) {
    return this.assist.tailorForMandate(...a);
  }
  translateDocuments(...a: Parameters<DocumentAssistService['translateDocuments']>) {
    return this.assist.translateDocuments(...a);
  }
  parse(...a: Parameters<CvParseService['parse']>) {
    return this.parseSvc.parse(...a);
  }
  parsePdf(...a: Parameters<CvParseService['parsePdf']>) {
    return this.parseSvc.parsePdf(...a);
  }
  scoreAgainstJob(...a: Parameters<AtsAiService['scoreAgainstJob']>) {
    return this.ats.scoreAgainstJob(...a);
  }
  pitchForMandate(...a: Parameters<OutreachAiService['pitchForMandate']>) {
    return this.outreachSvc.pitchForMandate(...a);
  }
  outreach(...a: Parameters<OutreachAiService['outreach']>) {
    return this.outreachSvc.outreach(...a);
  }
  explainMatch(...a: Parameters<MatchAiService['explainMatch']>) {
    return this.matchAi.explainMatch(...a);
  }
  interviewKit(...a: Parameters<MatchAiService['interviewKit']>) {
    return this.matchAi.interviewKit(...a);
  }
  candidatePrep(...a: Parameters<MatchAiService['candidatePrep']>) {
    return this.matchAi.candidatePrep(...a);
  }
}

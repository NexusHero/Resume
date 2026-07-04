import path from 'node:path';
import type { CandidateProfile } from './domain/skill';
import type { CandidateIdentity } from './domain/cover-letter';
import type { LlmProviderId } from './ports/llm-provider';

/** Runtime configuration, resolved from the environment and repo layout. */
export interface AppConfig {
  port: number;
  rootDir: string;
  storeDir: string;
  logFile: string;
  historyFile: string;
  savedSearchesFile: string;
  mandatesFile: string;
  talentsFile: string;
  placementsFile: string;
  candidaciesFile: string;
  documentsFile: string;
  attachmentsFile: string;
  attachmentsDir: string;
  usersFile: string;
  sessionsFile: string;
  passwordResetTokensFile: string;
  emailVerificationTokensFile: string;
  inviteTokensFile: string;
  tenantsFile: string;
  apiKeysFile: string;
  usageFile: string;
  interviewObservationsFile: string;
  assistantSettingsFile: string;
  assistantSuggestionsFile: string;
  artifactLogFile: string;
  stageTransitionsFile: string;
  retentionPolicyFile: string;
  staticDir: string;
  /** Repo-relative paths the Versioner stages on each change. */
  versionedPaths: string[];
  /** The searching candidate's skills (drives job matching). */
  candidateProfile: CandidateProfile;
  /** The candidate's identity (drives cover-letter authorship). */
  candidate: CandidateIdentity;
  /** LLM provider wiring for cover-letter generation. */
  llm: LlmConfig;
  /** Embedding backend for hybrid matching (hashed default, Ollama/OpenAI opt-in). */
  embedding: EmbeddingConfig;
  /** Instance-wide subscription plan; `pro` (default) leaves everything ungated. */
  plan: 'free' | 'pro';
  /** Pre-configured search run when /api/v1/jobs is called with no params. */
  defaultJobSearch: Record<string, unknown>;
  /** Which live job boards to query (none → offline sample). */
  jobSources: JobSourcesConfig;
  /** Storage backend: 'fs' (JSON files, default) or 'sql' (Postgres). */
  store: 'fs' | 'sql';
  /**
   * When true, a fresh registration creates its own new tenant (the registrant
   * becomes its admin) instead of joining the single default team (ADR-0036).
   * Off by default, so a plain install stays single-tenant.
   */
  selfServeTenants: boolean;
  /**
   * Emails granted the instance-level **super-admin** capability (ADR-0037):
   * cross-tenant visibility and management. Set out-of-band (env), never
   * grantable through the API, so it can't be escalated by a tenant admin.
   */
  superAdminEmails: string[];
  /** Where finished application PDFs are archived (filesystem or S3). */
  pdfArchive: PdfArchiveConfig;
  /** Max concurrent headless-Chromium PDF renders (bounds memory under load). */
  pdfRenderConcurrency: number;
  /** Postgres connection string, used when store === 'sql'. */
  databaseUrl: string;
  /** Authentication wiring (session cookie + social-login availability). */
  auth: AuthConfig;
  /** HTTP hardening (CORS allow-list). */
  security: SecurityConfig;
  /** Transactional email + password-reset wiring. */
  mail: MailConfig;
}

/** Transactional-email configuration, resolved from the environment. */
export interface MailConfig {
  /** `smtp` sends via nodemailer; anything else logs to the console (dev default). */
  transport: 'console' | 'smtp';
  /** From address on outgoing mail. */
  from: string;
  /** Public base URL used to build links in emails (e.g. the reset link). */
  appBaseUrl: string;
  /** Lifetime of a password-reset token in milliseconds. */
  resetTokenTtlMs: number;
  /** Lifetime of a tenant invitation in milliseconds (ADR-0035). */
  inviteTtlMs: number;
  /** SMTP relay settings, used when transport === 'smtp'. */
  smtp: { host: string; port: number; secure: boolean; user: string; pass: string };
  /**
   * IMAP mailbox settings for reply detection (the outcome loop's automatic
   * signal). Reply sync is enabled iff `host` is set.
   */
  imap: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    /** How often the server polls the inbox for replies (minutes). */
    pollMinutes: number;
  };
}

/** Security configuration, resolved from the environment. */
export interface SecurityConfig {
  /**
   * Browser origins allowed to call the API with credentials. Empty (the
   * default) means same-origin only: no `Access-Control-Allow-Origin` header is
   * sent, so cross-origin browsers are refused. Configure CORS_ORIGINS (a comma
   * list) to open specific origins.
   */
  corsOrigins: string[];
  /**
   * Secret used to encrypt stored secrets (e.g. per-user LLM API keys) at rest.
   * Set APP_SECRET in production; a fixed dev default keeps local/CI working but
   * is NOT secret.
   */
  encryptionSecret: string;
}

/** Authentication configuration, resolved from the environment. */
export interface AuthConfig {
  /** Name of the session cookie. */
  sessionCookieName: string;
  /** Send the session cookie with the Secure flag (HTTPS-only). On in production. */
  cookieSecure: boolean;
  /** Server-side session lifetime in milliseconds; sessions older than this are rejected. */
  sessionTtlMs: number;
  /** Social logins are "enabled" only when their credentials are configured. */
  google: { enabled: boolean };
  linkedin: { enabled: boolean };
}

/** LLM provider wiring, resolved from the environment. */
export interface LlmConfig {
  /** Provider selected at startup. */
  provider: LlmProviderId;
  anthropic: { apiKey: string; model: string };
  gemini: { apiKey: string; model: string };
}

/** Where archived application PDFs live (ADR-0031). */
export interface PdfArchiveConfig {
  /** `fs` (default, under the store dir) or `s3` (any S3-compatible bucket). */
  provider: 'fs' | 's3';
  s3: {
    bucket: string;
    region: string;
    /** Custom endpoint for non-AWS S3 (Cloudflare R2, Hetzner, MinIO); '' = AWS. */
    endpoint: string;
    /** Key prefix within the bucket. */
    prefix: string;
    /** Explicit credentials; empty falls back to the SDK's default chain. */
    accessKeyId: string;
    secretAccessKey: string;
    /** Path-style addressing, needed by some non-AWS endpoints (e.g. MinIO). */
    forcePathStyle: boolean;
  };
}

/** Which embedding backend hybrid matching uses (ADR-0017, ADR-0020). */
export interface EmbeddingConfig {
  /** `hashed` (offline default), `ollama` (local neural), or `openai` (API). */
  provider: 'hashed' | 'ollama' | 'openai';
  ollama: { url: string; model: string };
  openai: { apiKey: string; model: string; baseUrl: string };
  /** Per-call timeout for the neural backends (ms). */
  timeoutMs: number;
}

/** Live job-board wiring, resolved from the environment. */
export interface JobSourcesConfig {
  arbeitnow: { enabled: boolean };
  bundesagentur: { enabled: boolean; apiKey: string };
  adzuna: { enabled: boolean; appId: string; appKey: string; country: string };
}

/**
 * The candidate's skill set, derived from the CV. Core competencies carry more
 * weight so a job matching them scores higher than one matching peripheral tags.
 */
/**
 * The stand-in encryption secret used when `APP_SECRET` is unset. It keeps
 * local/CI working but is public, so it must never be used in production — the
 * readiness gate (config-validation.ts) refuses to boot on it.
 */
export const DEV_ENCRYPTION_SECRET = 'myjob-dev-insecure-secret';

const CANDIDATE_PROFILE: CandidateProfile = {
  skills: [
    { name: 'C++', weight: 3 },
    { name: 'Rust', weight: 3 },
    { name: 'Distributed Systems', weight: 2 },
    { name: 'gRPC', weight: 2 },
    { name: 'Kubernetes', weight: 1 },
    { name: 'Go', weight: 1 },
    { name: 'AWS', weight: 1 },
    { name: 'PostgreSQL', weight: 1 },
    { name: 'Microservices', weight: 1 },
    { name: 'Remote', weight: 1 },
  ],
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rootDir = path.resolve(__dirname, '..', '..');
  const storeDir = path.join(rootDir, 'archive', 'bewerbungen');

  // JOB_SOURCES is a comma list, e.g. "arbeitnow,bundesagentur,adzuna".
  // Unset → no live sources → offline sample (keeps dev/CI deterministic).
  const enabled = new Set(
    (env.JOB_SOURCES ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const adzunaId = env.ADZUNA_APP_ID ?? '';
  const adzunaKey = env.ADZUNA_APP_KEY ?? '';
  const port = Number(env.PORT ?? 4178);

  return {
    port,
    rootDir,
    storeDir,
    logFile: path.join(storeDir, 'log.json'),
    historyFile: path.join(storeDir, 'history.jsonl'),
    savedSearchesFile: path.join(storeDir, 'saved-searches.json'),
    mandatesFile: path.join(storeDir, 'mandates.json'),
    talentsFile: path.join(storeDir, 'talents.json'),
    placementsFile: path.join(storeDir, 'placements.json'),
    candidaciesFile: path.join(storeDir, 'candidacies.json'),
    documentsFile: path.join(storeDir, 'documents.json'),
    attachmentsFile: path.join(storeDir, 'attachments.json'),
    attachmentsDir: path.join(storeDir, 'attachments'),
    usersFile: path.join(storeDir, 'users.json'),
    sessionsFile: path.join(storeDir, 'sessions.json'),
    passwordResetTokensFile: path.join(storeDir, 'password-reset-tokens.json'),
    emailVerificationTokensFile: path.join(storeDir, 'email-verification-tokens.json'),
    inviteTokensFile: path.join(storeDir, 'tenant-invites.json'),
    tenantsFile: path.join(storeDir, 'tenants.json'),
    apiKeysFile: path.join(storeDir, 'api-keys.json'),
    usageFile: path.join(storeDir, 'usage.json'),
    interviewObservationsFile: path.join(storeDir, 'interview-observations.json'),
    assistantSettingsFile: path.join(storeDir, 'assistant-settings.json'),
    assistantSuggestionsFile: path.join(storeDir, 'assistant-suggestions.json'),
    artifactLogFile: path.join(storeDir, 'artifact-log.json'),
    stageTransitionsFile: path.join(storeDir, 'stage-transitions.json'),
    retentionPolicyFile: path.join(storeDir, 'retention-policy.json'),
    staticDir: rootDir,
    versionedPaths: ['archive/bewerbungen'],
    candidateProfile: CANDIDATE_PROFILE,
    candidate: {
      name: env.CANDIDATE_NAME ?? 'Suhay Sevinc',
      title: env.CANDIDATE_TITLE ?? 'M.Sc. Software Engineer',
    },
    llm: {
      provider: env.LLM_PROVIDER === 'gemini' ? 'gemini' : 'claude',
      anthropic: {
        apiKey: env.ANTHROPIC_API_KEY ?? '',
        model: env.ANTHROPIC_MODEL ?? 'claude-opus-4-8',
      },
      gemini: {
        apiKey: env.GEMINI_API_KEY ?? '',
        model: env.GEMINI_MODEL ?? 'gemini-2.5-flash',
      },
    },
    embedding: {
      provider:
        env.EMBEDDING_PROVIDER === 'ollama'
          ? 'ollama'
          : env.EMBEDDING_PROVIDER === 'openai'
            ? 'openai'
            : 'hashed',
      ollama: {
        url: (env.OLLAMA_URL ?? 'http://localhost:11434').replace(/\/+$/, ''),
        model: env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text',
      },
      openai: {
        apiKey: env.OPENAI_API_KEY ?? '',
        model: env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small',
        baseUrl: (env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, ''),
      },
      timeoutMs: Number(env.EMBEDDING_TIMEOUT_MS) || 10_000,
    },
    // Default `pro` so the Pro gate is present but ungated until a plan/license
    // mechanism is wired; set PLAN=free to enforce (ADR-0021).
    plan: env.PLAN === 'free' ? 'free' : 'pro',
    defaultJobSearch: { threshold: 80 },
    jobSources: {
      arbeitnow: { enabled: enabled.has('arbeitnow') },
      bundesagentur: {
        enabled: enabled.has('bundesagentur'),
        apiKey: env.BA_API_KEY ?? 'jobboerse-jobsuche',
      },
      adzuna: {
        // Adzuna needs credentials; enabling it without them would only 401.
        enabled: enabled.has('adzuna') && Boolean(adzunaId && adzunaKey),
        appId: adzunaId,
        appKey: adzunaKey,
        country: env.ADZUNA_COUNTRY ?? 'de',
      },
    },
    store: env.STORE === 'sql' ? 'sql' : 'fs',
    selfServeTenants: env.SELF_SERVE_TENANTS === 'true',
    superAdminEmails: (env.SUPER_ADMIN_EMAIL ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    databaseUrl: env.DATABASE_URL ?? '',
    pdfArchive: {
      provider: env.PDF_ARCHIVE === 's3' ? 's3' : 'fs',
      s3: {
        bucket: env.S3_BUCKET ?? '',
        region: env.S3_REGION ?? 'us-east-1',
        endpoint: (env.S3_ENDPOINT ?? '').replace(/\/+$/, ''),
        prefix: env.S3_PREFIX ?? 'pdf-archive',
        accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
        forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      },
    },
    pdfRenderConcurrency: Math.max(1, Number(env.PDF_RENDER_CONCURRENCY) || 2),
    auth: {
      sessionCookieName: env.SESSION_COOKIE_NAME ?? 'myjob_session',
      // Secure cookies require HTTPS; on by default in production, or opt in via
      // COOKIE_SECURE so local http dev/tests keep working.
      cookieSecure: env.NODE_ENV === 'production' || env.COOKIE_SECURE === 'true',
      sessionTtlMs: (Number(env.SESSION_TTL_DAYS) || 30) * 24 * 60 * 60 * 1000,
      google: { enabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) },
      linkedin: { enabled: Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET) },
    },
    security: {
      corsOrigins: (env.CORS_ORIGINS ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
      encryptionSecret: env.APP_SECRET ?? DEV_ENCRYPTION_SECRET,
    },
    mail: {
      transport: env.MAIL_TRANSPORT === 'smtp' ? 'smtp' : 'console',
      from: env.MAIL_FROM ?? 'myJob <no-reply@myjob.local>',
      // Public origin the app is reached at; drives the link inside reset emails.
      appBaseUrl: (env.APP_BASE_URL ?? `http://localhost:${port}`).replace(/\/+$/, ''),
      resetTokenTtlMs: (Number(env.RESET_TOKEN_TTL_MINUTES) || 60) * 60 * 1000,
      inviteTtlMs: (Number(env.INVITE_TTL_DAYS) || 7) * 24 * 60 * 60 * 1000,
      smtp: {
        host: env.SMTP_HOST ?? '',
        port: Number(env.SMTP_PORT) || 587,
        // Implicit TLS (port 465) → secure; STARTTLS (587) negotiates from plain.
        secure: env.SMTP_SECURE === 'true' || Number(env.SMTP_PORT) === 465,
        user: env.SMTP_USER ?? '',
        pass: env.SMTP_PASS ?? '',
      },
      imap: {
        host: env.MAIL_IMAP_HOST ?? '',
        port: Number(env.MAIL_IMAP_PORT) || 993,
        // IMAP almost universally runs implicit TLS on 993; opt out explicitly.
        secure: env.MAIL_IMAP_SECURE !== 'false',
        user: env.MAIL_IMAP_USER ?? '',
        pass: env.MAIL_IMAP_PASS ?? '',
        pollMinutes: Math.max(1, Number(env.MAIL_IMAP_POLL_MINUTES) || 15),
      },
    },
  };
}

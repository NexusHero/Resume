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
  apiKeysFile: string;
  staticDir: string;
  /** Repo-relative paths the Versioner stages on each change. */
  versionedPaths: string[];
  /** The searching candidate's skills (drives job matching). */
  candidateProfile: CandidateProfile;
  /** The candidate's identity (drives cover-letter authorship). */
  candidate: CandidateIdentity;
  /** LLM provider wiring for cover-letter generation. */
  llm: LlmConfig;
  /** Pre-configured search run when /api/v1/jobs is called with no params. */
  defaultJobSearch: Record<string, unknown>;
  /** Which live job boards to query (none → offline sample). */
  jobSources: JobSourcesConfig;
  /** Storage backend: 'fs' (JSON files, default) or 'sql' (Postgres). */
  store: 'fs' | 'sql';
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
  /** SMTP relay settings, used when transport === 'smtp'. */
  smtp: { host: string; port: number; secure: boolean; user: string; pass: string };
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
    apiKeysFile: path.join(storeDir, 'api-keys.json'),
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
    databaseUrl: env.DATABASE_URL ?? '',
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
      encryptionSecret: env.APP_SECRET ?? 'myjob-dev-insecure-secret',
    },
    mail: {
      transport: env.MAIL_TRANSPORT === 'smtp' ? 'smtp' : 'console',
      from: env.MAIL_FROM ?? 'myJob <no-reply@myjob.local>',
      // Public origin the app is reached at; drives the link inside reset emails.
      appBaseUrl: (env.APP_BASE_URL ?? `http://localhost:${port}`).replace(/\/+$/, ''),
      resetTokenTtlMs: (Number(env.RESET_TOKEN_TTL_MINUTES) || 60) * 60 * 1000,
      smtp: {
        host: env.SMTP_HOST ?? '',
        port: Number(env.SMTP_PORT) || 587,
        // Implicit TLS (port 465) → secure; STARTTLS (587) negotiates from plain.
        secure: env.SMTP_SECURE === 'true' || Number(env.SMTP_PORT) === 465,
        user: env.SMTP_USER ?? '',
        pass: env.SMTP_PASS ?? '',
      },
    },
  };
}

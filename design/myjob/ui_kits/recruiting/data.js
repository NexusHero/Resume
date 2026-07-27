/* myJob — data layer: pipeline stage constants, the RecruitApi REST client,
   and pure aggregate helpers for the dashboard/reports. All records come from
   the live API — there is no sample data; views render loading, error or empty
   states instead (see app.jsx useResource). */

const STAGES_ORDER = ['new', 'review', 'interview', 'offer', 'hired'];
const STAGE_LABELS = { new: 'Neu', review: 'Sichtung', interview: 'Interview', offer: 'Angebot', hired: 'Eingestellt', rejected: 'Absage' };

/* Backend application status → the board's pipeline stage. The domain uses
   sent/screening/…; the board columns are new/review/interview/offer/hired. */
const APP_STATUS_TO_STAGE = {
  sent: 'new',
  screening: 'review',
  interview: 'interview',
  offer: 'offer',
  hired: 'hired',
  rejected: 'rejected',
};

/* The reverse: a board stage the recruiter dropped a card into → the backend
   status to persist. Keeps the PATCH payload valid (domain statuses only). */
const STAGE_TO_APP_STATUS = {
  new: 'sent',
  review: 'screening',
  interview: 'interview',
  offer: 'offer',
  hired: 'hired',
  rejected: 'rejected',
};

/* ============================================================
   Live backend wiring. Base URL is same-origin when served by the
   app server; override via window.RECRUIT_API.
   ============================================================ */
const RECRUIT_API_BASE = (typeof window !== 'undefined' && window.RECRUIT_API) || '/api/v1';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* Trigger a real "Save as…" download for an in-memory blob. Opening a PDF URL
   with window.open() is unreliable — a strict CSP, the installed PWA, or the
   Capacitor shell can silently swallow it, so the file never lands. Fetching the
   bytes and clicking a download anchor works everywhere the app runs. */
function _saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the click has committed to the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* Fetch a same-origin (cookie-authenticated) PDF endpoint and save it as a file.
   Throws on a non-OK response so the caller can surface a real error instead of
   a button that appears to do nothing. */
async function _downloadPdf(url, filename) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`API ${res.status}`);
  _saveBlob(await res.blob(), filename);
}

async function _jsonOrThrow(res) {
  if (!res.ok) {
    // A Pro-gated feature (ADR-0021) — surface an upgrade hint, not a raw code.
    if (res.status === 402) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || 'This is a Pro feature. Upgrade to unlock it.');
    }
    throw new Error(`API ${res.status}`);
  }
  return res.json();
}

/* Backend Application → the shape PipelineBoard renders. `talentId`/`talentName`
   are present when the application was filed on a candidate's behalf (Matching);
   `role` is the applied-for position. */
function mapApplication(a) {
  return {
    id: a.id,
    company: a.company,
    role: a.position || '',
    talentId: a.talentId || null,
    talentName: a.talentName || '',
    status: APP_STATUS_TO_STAGE[a.status] || 'new',
    score: typeof a.score === 'number' ? a.score : null,
    date: a.date || '',
    source: a.source || '',
  };
}

/* Backend Placement → the shape PlatzierungenView/ReportsView render. */
function mapPlacement(p) {
  return {
    id: p.id,
    candName: p.candidateName,
    candRole: p.candidateRole,
    client: p.client,
    start: p.start,
    fee: p.fee,
    status: cap(p.status),
  };
}

/* A sample (or UI) placement → the POST body the API expects. */
function toPlacementCreate(p) {
  return {
    candidateName: p.candName || p.candidateName || '',
    candidateRole: p.candRole || p.candidateRole || '',
    client: p.client || '',
    start: p.start || '',
    fee: p.fee || '',
    status: (p.status || 'probation').toLowerCase(),
  };
}

/* Backend Talent → the shape TalentGrid/TalentProfile render. Dossier fields
   (resume, attachments, letter) are absent on purpose: TalentProfile shows its
   empty states for API talents, while the rich "me" talent stays the sample
   object (its dossier is edited via the document editor — a separate concern). */
function mapTalent(t) {
  const filled =
    [t.role, t.headline, t.location, t.email, t.phone, t.availability, t.salary].filter(Boolean)
      .length + (Array.isArray(t.skills) && t.skills.length ? 1 : 0);
  return {
    id: t.id,
    name: t.name,
    role: t.role || '',
    headline: t.headline || '',
    location: t.location || '',
    email: t.email || '',
    phone: t.phone || '',
    availability: t.availability || '',
    salary: t.salary || '',
    // Prefer the server's merged view (stored skills + what the documents
    // prove); fall back to the raw field for older payloads.
    skills: Array.isArray(t.effectiveSkills) ? t.effectiveSkills : Array.isArray(t.skills) ? t.skills : [],
    score: typeof t.score === 'number' ? t.score : Math.round((filled / 8) * 100),
    attachments: [],
    me: false,
  };
}

/* A UI talent → the POST body the API expects. */
function toTalentCreate(t) {
  return {
    name: t.name || '',
    role: t.role || '',
    headline: t.headline || '',
    location: t.location || '',
    email: t.email || '',
    phone: t.phone || '',
    availability: t.availability || '',
    salary: t.salary || '',
    // The form field is a comma-separated string; the API wants an array.
    skills: Array.isArray(t.skills)
      ? t.skills
      : String(t.skills || '')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
  };
}

/* Backend Mandate → the shape MandateView renders (client is already a name). */
function mapMandate(m) {
  return {
    id: m.id,
    client: m.client,
    role: m.role,
    location: m.location,
    fee: m.fee,
    feeValue: m.feeValue,
    deadline: m.deadline,
    priority: m.priority,
    status: m.status,
    submitted: m.submitted,
    interviews: m.interviews,
    jobText: m.jobText || '',
  };
}

/* A UI mandate → the POST body the API expects. */
function toMandateCreate(m) {
  return {
    client: m.client || '',
    role: m.role || '',
    location: m.location || '',
    fee: m.fee || '',
    feeValue: m.feeValue || '',
    deadline: m.deadline || '',
    priority: m.priority || 'medium',
    status: m.status || 'active',
    submitted: m.submitted || 0,
    interviews: m.interviews || 0,
    jobText: m.jobText || '',
  };
}

const RecruitApi = {
  /* ---- Auth ---- */
  async authMe() {
    const data = await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/auth/me`));
    // Carry the plan (ADR-0021) on the user so the UI can gate Pro affordances;
    // the server middleware remains the real gate.
    return data.user
      ? { ...data.user, plan: data.plan, isSuperAdmin: data.isSuperAdmin === true }
      : null;
  },
  async listMembers() {
    const data = await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/members`));
    return Array.isArray(data) ? data : []; // [{ id, email, roles, createdAt }]
  },
  async setMemberRoles(id, roles) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/members/${id}/roles`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roles }),
      }),
    );
    return data.member;
  },
  async listInvites() {
    const data = await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/members/invites`));
    return Array.isArray(data) ? data : []; // [{ email, roles, invitedBy, createdAt }]
  },
  async createInvite(email, roles) {
    // { invite, acceptUrl } — the URL carries the single-use token for offline sharing.
    return _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/members/invites`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, roles }),
      }),
    );
  },
  /* ---- Super-admin console (ADR-0037/0038) ---- */
  async listTenants() {
    const data = await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/admin/tenants`));
    return Array.isArray(data) ? data : []; // [{ id, name, createdAt, status, memberCount }]
  },
  async setTenantStatus(id, status) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/admin/tenants/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    );
    return data.tenant;
  },
  async listTenantMembers(id) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/admin/tenants/${encodeURIComponent(id)}/members`),
    );
    return Array.isArray(data) ? data : [];
  },
  async setTenantMemberRoles(tenantId, userId, roles) {
    const data = await _jsonOrThrow(
      await fetch(
        `${RECRUIT_API_BASE}/admin/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(userId)}/roles`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ roles }),
        },
      ),
    );
    return data.member;
  },
  async acceptInvite(token, password) {
    const res = await fetch(`${RECRUIT_API_BASE}/auth/accept-invite`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (!res.ok)
      throw new Error(
        (await res.json().catch(() => ({}))).detail || 'This invitation is invalid or has expired',
      );
    return (await res.json()).user;
  },
  async retentionReport(days) {
    const q = Number.isFinite(days) ? `?days=${days}` : '';
    const data = await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/retention/report${q}`));
    return Array.isArray(data) ? data : []; // [{ talentId, name, role, lastActivity, inactiveDays }]
  },
  async anonymizeTalent(talentId) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/anonymize`, { method: 'POST' }),
    );
    return data.talent;
  },
  async getRetentionPolicy() {
    // { reviewDays, deletionDays, autoAnonymize }
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/retention/policy`));
  },
  async updateRetentionPolicy(patch) {
    return _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/retention/policy`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      }),
    );
  },
  async anonymizeOverdue() {
    // { overdue, anonymized, talentIds[] }
    return _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/retention/anonymize-overdue`, { method: 'POST' }),
    );
  },
  async authProviders() {
    try {
      return await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/auth/providers`));
    } catch {
      return { google: false, linkedin: false };
    }
  },
  async authLogin(email, password) {
    const res = await fetch(`${RECRUIT_API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Login failed');
    return (await res.json()).user;
  },
  async authRegister(email, password) {
    const res = await fetch(`${RECRUIT_API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok)
      throw new Error((await res.json().catch(() => ({}))).detail || 'Could not create account');
    return (await res.json()).user;
  },
  async authLogout() {
    await fetch(`${RECRUIT_API_BASE}/auth/logout`, { method: 'POST' });
  },
  async requestEmailVerification() {
    const res = await fetch(`${RECRUIT_API_BASE}/auth/verify-email/request`, { method: 'POST' });
    if (!res.ok)
      throw new Error((await res.json().catch(() => ({}))).detail || 'Could not send the email');
  },
  async confirmEmailVerification(token) {
    const res = await fetch(`${RECRUIT_API_BASE}/auth/verify-email/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok)
      throw new Error((await res.json().catch(() => ({}))).detail || 'Verification failed');
  },
  async requestPasswordReset(email) {
    // Always resolves (the server replies 202 whether or not the email exists).
    await fetch(`${RECRUIT_API_BASE}/auth/password-reset/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  },
  async confirmPasswordReset(token, password) {
    const res = await fetch(`${RECRUIT_API_BASE}/auth/password-reset/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (!res.ok)
      throw new Error(
        (await res.json().catch(() => ({}))).detail || 'This reset link is invalid or has expired',
      );
  },
  /* ---- Account (DSGVO) ---- */
  async exportAccount() {
    // The full owner-scoped payload (account + mandates/talents/placements).
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/account/export`));
  },
  async deleteAccount() {
    const res = await fetch(`${RECRUIT_API_BASE}/account`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
  },
  /* ---- Weighted pipeline revenue forecast ---- */
  async getForecast() {
    // { totalWeighted, totalFaceValue, mandates: [{ client, role, feeValue, probability, weightedValue, candidacies, topStage }] }
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/forecast`));
  },
  /* ---- AGG (anti-discrimination) compliance check ---- */
  async aggCheck(text) {
    // { findings[], riskLevel, hasGenderMarker, summary }
    return _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/compliance/agg-check`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      }),
    );
  },
  async aggRewrite(text) {
    // { text, changed, edits[], unresolved[] }
    return _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/compliance/agg-rewrite`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      }),
    );
  },
  /* ---- AI usage counter (per-user requests / tokens / cost) ---- */
  async getUsage() {
    // { requests, inputTokens, outputTokens, totalTokens, costUsd, byProvider[], byFeature[] }
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/settings/usage`));
  },
  async getUsageAudit() {
    // [{ at, provider, feature, inputTokens, outputTokens, costUsd }] newest first
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/settings/usage/audit`));
  },
  usageAuditCsvUrl() {
    // download URL for the KI-Audit-Trail CSV (same-origin, cookie-authenticated)
    return `${RECRUIT_API_BASE}/settings/usage/audit.csv`;
  },
  /* ---- LLM settings (active provider + availability) ---- */
  async getLlmSettings() {
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/settings/llm`));
  },
  async setLlmProvider(provider) {
    return _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/settings/llm`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider }),
      }),
    );
  },
  /* ---- Per-user API keys (stored encrypted server-side) ---- */
  async getApiKeyStatus() {
    // { claude: boolean, gemini: boolean } — never the keys themselves.
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/settings/keys`));
  },
  async setApiKey(provider, key) {
    const res = await fetch(`${RECRUIT_API_BASE}/settings/keys/${provider}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
  },
  async removeApiKey(provider) {
    const res = await fetch(`${RECRUIT_API_BASE}/settings/keys/${provider}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
  },
  async listMandates() {
    const data = await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/mandates`));
    return Array.isArray(data) ? data.map(mapMandate) : [];
  },
  async createMandate(input) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/mandates`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toMandateCreate(input)),
      }),
    );
    return mapMandate(data.mandate);
  },
  async updateMandate(id, input) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/mandates/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toMandateCreate(input)),
      }),
    );
    return mapMandate(data.mandate);
  },
  async listTalents() {
    const data = await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/talents`));
    return Array.isArray(data) ? data.map(mapTalent) : [];
  },
  /* ---- Applications (the submission pipeline) ---- */
  async listApplications() {
    const data = await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/applications`));
    return Array.isArray(data) ? data.map(mapApplication) : [];
  },
  /* Apply on a candidate's behalf from Matching: record an application that
     carries the posting's company + role, so it lands in the Applications
     pipeline and the company data is captured on the submission. */
  async applyCandidate(job, talent, pdfBase64 = null) {
    const body = {
      company: job.company || '',
      position: job.title || '',
      reference: job.url || '',
      source: 'matching',
      status: 'sent',
      talentName: (talent && talent.name) || '',
    };
    if (talent && talent.id && talent.id !== 'me') body.talentId = talent.id;
    if (pdfBase64) body.pdfBase64 = pdfBase64;
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/applications`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
    return mapApplication(data.application);
  },
  /* Move an application to another pipeline stage — the board's drag/dropdown.
     Maps the board stage back to a domain status and PATCHes it. */
  async updateApplicationStage(id, stage) {
    const status = STAGE_TO_APP_STATUS[stage] || 'sent';
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/applications/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    );
    return mapApplication(data.application);
  },
  /* Remove a mis-filed application. 204 No Content on success. */
  async deleteApplication(id) {
    const res = await fetch(`${RECRUIT_API_BASE}/applications/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Could not delete application (${res.status})`);
  },
  /* Live job postings from the two-tier search (both tiers merged — the
     Matching view re-scores per selected candidate, not per the server's
     default profile). Postings are always real board data; when every live
     source is down the list is empty and `liveDown` is set. */
  async searchJobs(q = '') {
    const url = q
      ? `${RECRUIT_API_BASE}/jobs?q=${encodeURIComponent(q)}`
      : `${RECRUIT_API_BASE}/jobs`;
    const data = await _jsonOrThrow(await fetch(url));
    const merged = [...(data.top || []), ...(data.more || [])];
    const jobs = merged.map((j) => ({
      id: j.id,
      title: j.role,
      company: j.company,
      location: j.city || '',
      country: j.country || '',
      source: j.source || '',
      pensum: j.mode || '',
      salary: j.salary || '',
      posted: j.posted || '',
      url: j.url || '',
      req: Array.isArray(j.skills) ? j.skills : [],
    }));
    // liveDown = live sources ARE configured but all failed on this search, so
    // the list is empty because of an outage rather than a lack of matches.
    // sources = per-board breakdown [{ name, count, ok }] for the accumulated
    // source counts shown above the results.
    return {
      jobs,
      liveDown: !!data.liveSourcesDown,
      sources: Array.isArray(data.sources) ? data.sources : [],
      total: data.counts && typeof data.counts.total === 'number' ? data.counts.total : jobs.length,
    };
  },
  // --- Recruiting pipeline (candidacies) ---
  async mandateCandidacies(mandateId) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/mandates/${mandateId}/candidacies`),
    );
    return Array.isArray(data) ? data : []; // [{ id, talentId, stage, note, order, talent }]
  },
  async talentCandidacies(talentId) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/candidacies`),
    );
    return Array.isArray(data) ? data : []; // [{ id, mandateId, stage, mandate }]
  },
  async addCandidacy(mandateId, { talentId, stage, note } = {}) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/mandates/${mandateId}/candidacies`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ talentId, stage, note }),
      }),
    );
    return data.candidacy;
  },
  async matchMandate(mandateId, { jobText = '', limit = 10 } = {}) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/mandates/${mandateId}/match`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jobText, limit }),
      }),
    );
    // [{ talentId, name, role, location, score, matched, inPipeline }] sorted by fit
    return Array.isArray(data.matches) ? data.matches : [];
  },
  async explainMatch(mandateId, talentId) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/mandates/${mandateId}/candidates/${talentId}/explain`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    return data.explanation; // { summary, reasons[], matchedSkills[], provider }
  },
  async interviewKit(mandateId, talentId) {
    const data = await _jsonOrThrow(
      await fetch(
        `${RECRUIT_API_BASE}/mandates/${mandateId}/candidates/${talentId}/interview-kit`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        },
      ),
    );
    return data.kit; // { focus, questions[], scorecard[], provider }
  },
  async candidatePrep(mandateId, talentId) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/mandates/${mandateId}/candidates/${talentId}/prep`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    return data.prep; // { companyLabel, formats, obligations, requirementChecks, strengths, likelyQuestions, starAnswers, candidateQuestions, provider }
  },
  /* ---- Interview-observation flywheel ---- */
  // --- outcome loop: generated artifacts and what became of them ---
  async listArtifacts(talentId) {
    const q = talentId ? `?talentId=${encodeURIComponent(talentId)}` : '';
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/artifacts${q}`));
  },
  async setArtifactOutcome(id, outcome) {
    return _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/artifacts/${id}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      }),
    );
  },
  async getArtifactStats() {
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/artifacts/stats`));
  },

  // --- email integration: send outreach + reply detection ---
  async getMailStatus() {
    // { sendTransport: 'console'|'smtp', replySync: bool, pollMinutes }
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/mail/status`));
  },
  async sendOutreach(talentId, { subject, body }) {
    return _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/outreach/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      }),
    );
  },
  async syncMailReplies() {
    // { checked, messages, replies }
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/mail/sync-replies`, { method: 'POST' }));
  },

  // --- assistant: settings + reviewable suggestion queue ---
  async getAssistant() {
    // { settings: { enabled, mode, intervalMinutes, lastRunAt? }, counts: {...} }
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/assistant`));
  },
  async updateAssistant(patch) {
    return _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/assistant`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }),
    );
  },
  async runAssistant() {
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/assistant/run`, { method: 'POST' }));
  },
  async listAssistantSuggestions() {
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/assistant/suggestions`));
  },
  async resolveAssistantSuggestion(id, action) {
    // action: 'accept' | 'dismiss'
    return _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/assistant/suggestions/${id}/${action}`, { method: 'POST' }),
    );
  },
  assistantDossierUrl(id) {
    // the staged application's Bewerbungsmappe (same-origin, cookie-authenticated)
    return `${RECRUIT_API_BASE}/assistant/suggestions/${id}/dossier.pdf`;
  },
  async companyKnowledge(mandateId) {
    // { company, profile: { sampleSize, formats[], typicalRounds, difficulty, confidence } | null, observations[] }
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/mandates/${mandateId}/observations`));
  },
  async recordObservation(mandateId, input) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/mandates/${mandateId}/observations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input), // { talentId?, rounds, formats[], difficulty, notes }
      }),
    );
    return data.observation;
  },
  async updateCandidacy(id, patch) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/candidacies/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch), // { stage?, note?, order? }
      }),
    );
    return data.candidacy;
  },
  async removeCandidacy(id) {
    const res = await fetch(`${RECRUIT_API_BASE}/candidacies/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
  },
  async createTalent(input) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toTalentCreate(input)),
      }),
    );
    return mapTalent(data.talent);
  },
  /* Bulk-import CVs (PDF): items are { dataBase64, filename }. Returns a
     per-file result array (order matches the request). */
  async importTalents(items) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items }),
      }),
    );
    return data.results;
  },
  /* ---- Talent documents (resume + cover letter, stored server-side) ---- */
  async getTalentDocuments(talentId) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents`),
    );
    return data.documents; // { contact, resume, letter, style, updatedAt }
  },
  async saveTalentDocuments(talentId, documents) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(documents),
      }),
    );
    return data.documents;
  },
  /* Render the given (unsaved) editor content to the exact HTML the PDF export
     is built from, so the live preview and the PDF can never drift (ADR-0052).
     Nothing is persisted; works even for the pinned "me" profile (no server row)
     since the endpoint renders the posted body, not stored data. */
  async previewDocumentsHtml(talentId, documents) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents/preview`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(documents),
      }),
    );
    return data.html; // a self-contained, print-accurate HTML document
  },
  /* The recruiter's own display name, stored on their "me" document set (they
     are keyed by user id server-side). Read/merge-write so setting the name
     never clobbers an existing resume/letter. */
  async getMyProfileName(userId) {
    const d = await this.getTalentDocuments(userId).catch(() => null);
    return (d && d.contact && d.contact.name) || '';
  },
  async setMyProfileName(userId, name) {
    const d = (await this.getTalentDocuments(userId).catch(() => null)) || {};
    return this.saveTalentDocuments(userId, {
      contact: { ...(d.contact || {}), name },
      resume: d.resume,
      letter: d.letter,
      style: d.style,
    });
  },
  talentDocumentsPdfUrl(talentId) {
    // Same-origin GET — the session cookie authorises it, so it can be opened
    // directly in a new tab / used as a download link.
    return `${RECRUIT_API_BASE}/talents/${talentId}/documents/pdf`;
  },
  /* Download the talent's resume + cover letter as a PDF file. Reliable across
     the strict-CSP web app, the installed PWA and the native shell where a bare
     window.open() can silently fail. Rejects on error so the UI can react. */
  async downloadTalentDocumentsPdf(talentId, filename) {
    await _downloadPdf(this.talentDocumentsPdfUrl(talentId), filename || `documents-${talentId}.pdf`);
  },
  talentDossierPdfUrl(talentId, recipient = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(recipient)) if (v) q.set(k, v);
    const qs = q.toString();
    return `${RECRUIT_API_BASE}/talents/${talentId}/dossier/pdf${qs ? `?${qs}` : ''}`;
  },
  async talentDossierPreviewPdf(talentId, documents, recipient = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(recipient)) if (v) q.set(k, v);
    const qs = q.toString();
    const res = await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/dossier/pdf${qs ? `?${qs}` : ''}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(documents),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.blob();
  },
  async talentDossierPreviewZip(talentId, documents, recipient = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(recipient)) if (v) q.set(k, v);
    const qs = q.toString();
    const res = await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/dossier/zip${qs ? `?${qs}` : ''}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(documents),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.blob();
  },
  /* ---- Attachments (files stored server-side per talent) ---- */
  async listAttachments(talentId) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/attachments`),
    );
    return Array.isArray(data) ? data : [];
  },
  async uploadAttachment(talentId, { name, contentType, dataBase64 }) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/attachments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, contentType, dataBase64 }),
      }),
    );
    return data.attachment;
  },
  async deleteAttachment(attachmentId) {
    const res = await fetch(`${RECRUIT_API_BASE}/attachments/${attachmentId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
  },
  async suggestDocument(talentId, action, target = {}) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents/ai`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...target }),
      }),
    );
    return data.suggestion; // { action, text?, paragraphs?, provider }
  },
  async parseDocument(talentId, text) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents/parse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      }),
    );
    return data.parsed; // { contact, resume, provider }
  },
  async parseDocumentPdf(talentId, dataBase64) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents/parse-pdf`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dataBase64 }),
      }),
    );
    return data.parsed; // { contact, resume, provider, extractedChars }
  },
  async atsScore(talentId, jobText) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents/ats`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jobText }),
      }),
    );
    return data.ats; // { score, matched, missing, suggestions, provider }
  },
  async pitchCandidate(talentId, mandateContext = '') {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents/pitch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mandateContext }),
      }),
    );
    return data.pitch; // { headline, paragraphs, highlights, provider }
  },
  async outreachMessage(talentId, opts = {}) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents/outreach`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(opts), // { audience, channel, tone, mandateContext, recruiterName }
      }),
    );
    return data.message; // { subject, body, provider }
  },
  async translateDocuments(talentId, targetLang) {
    const res = await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents/translate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetLang }),
    });
    if (!res.ok) {
      // Surface the problem+json detail (e.g. "add a key") to the UI.
      let detail = `API ${res.status}`;
      try {
        detail = (await res.json()).detail || detail;
      } catch {
        /* non-JSON error body */
      }
      throw new Error(detail);
    }
    return res.json(); // { lang, translation, created }
  },
  async listPlacements() {
    const data = await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/placements`));
    return Array.isArray(data) ? data.map(mapPlacement) : [];
  },
  async createPlacement(input) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/placements`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toPlacementCreate(input)),
      }),
    );
    return mapPlacement(data.placement);
  },
  async updatePlacement(id, input) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/placements/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toPlacementCreate(input)),
      }),
    );
    return mapPlacement(data.placement);
  },
  async deletePlacement(id) {
    const res = await fetch(`${RECRUIT_API_BASE}/placements/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
  },
};

/* ---------- Live aggregates ----------
   The Übersicht (Dashboard) and Berichte (Reports) read from the same live
   mandates/talents/placements the other views do, so their KPIs and the
   fee-per-client breakdown reflect the signed-in recruiter's own data rather
   than the static sample. All helpers are pure so they degrade gracefully to
   the offline samples when the API is unreachable. */

/** "19.000 €" / "24%" → 19000 / 24 (digits only; German thousands dot dropped). */
function parseFeeAmount(s) {
  return parseInt(String(s == null ? '' : s).replace(/[^0-9]/g, ''), 10) || 0;
}

/** Sum of placement fees, formatted compactly: 128450 → "128 T€", 540 → "540 €". */
function formatFeeSum(sum) {
  return sum >= 1000 ? `${Math.round(sum / 1000)} T€` : `${sum} €`;
}

/** Recruiter KPIs derived from the live data (no deltas — there's no baseline). */
function computeVermittlerKpis(mandates, talents, placements) {
  const ms = mandates || [];
  const ts = talents || [];
  const ps = placements || [];
  const active = ms.filter((m) => m.status === 'active').length;
  const fees = ps.reduce((a, p) => a + parseFeeAmount(p.fee), 0);
  return [
    { label: 'Aktive Mandate', value: String(active), icon: 'briefcase' },
    { label: 'Talente im Pool', value: String(ts.length), icon: 'users' },
    { label: 'Platzierungen', value: String(ps.length), icon: 'award' },
    { label: 'Honorar', value: formatFeeSum(fees), icon: 'trend' },
  ];
}

/** The client universe for Reports: every client named by a live mandate or
    placement, so fees-per-client covers API clients absent from the sample. */
function deriveReportClients(mandates, placements) {
  const names = [];
  const seen = new Set();
  [...(mandates || []), ...(placements || [])].forEach((row) => {
    const name = row && row.client;
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push({ name });
    }
  });
  return names;
}

Object.assign(window, { STAGES_ORDER, STAGE_LABELS, RecruitApi, computeVermittlerKpis, deriveReportClients });

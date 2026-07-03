/* EditorModals — the editor's four bolt-on tools, each a self-contained modal
   that owns its own state and talks to window.RecruitApi directly:
   - ImportCvModal: paste/upload a CV, AI-parse it, hand {contact, resume} back
     to the editor via onParsed.
   - AtsModal: score the résumé against a pasted job ad.
   - PitchModal: a "why this candidate" short profile for the client.
   - OutreachModal: first-contact message (candidate/client, email/LinkedIn).
   All are only reachable when the talent persists (canPersist in the editor),
   so they can assume a real server-backed talentId. */
const EDM = window.MyJobDesignSystem_f3658e;
const { ModalShell: EdmModalShell, PillButton: EdmPillButton, GroundingWarning: EdmGroundingWarning, ProviderBadge: EdmProviderBadge } = window;

/* Shared input style for the modal textareas / text inputs. */
const EDM_FIELD = { width: '100%', padding: '11px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', color: 'var(--text-heading)', fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none' };

/* ---- Import: paste a CV or upload a PDF, let the AI parse it into fields ---- */
function ImportCvModal({ talentId, onParsed, onClose }) {
  const [importText, setImportText] = React.useState('');
  const [parsing, setParsing] = React.useState(false);
  const [importHint, setImportHint] = React.useState('');
  const pdfInputRef = React.useRef(null);
  const runImport = async () => {
    if (!importText.trim() || !talentId) return;
    setParsing(true);
    setImportHint('');
    try {
      onParsed(await window.RecruitApi.parseDocument(talentId, importText));
      onClose();
    } catch {
      /* ignore parse error */
    }
    setParsing(false);
  };
  const runImportPdf = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !talentId) return;
    setParsing(true);
    setImportHint('');
    try {
      const dataBase64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(',')[1] || '');
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const parsed = await window.RecruitApi.parseDocumentPdf(talentId, dataBase64);
      if (parsed.extractedChars === 0) {
        // scanned/image-only PDF — no text layer to read
        setImportHint('No text found in this PDF (scanned image?). Paste the text instead.');
      } else {
        onParsed(parsed);
        onClose();
      }
    } catch {
      setImportHint('Could not read that PDF. Try pasting the text instead.');
    }
    setParsing(false);
  };

  return (
    <EdmModalShell title="Import a CV" subtitle="Upload a PDF or paste the résumé text — the AI extracts profile, experience and skills into the editor." onClose={onClose} scroll={false}>
      <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" onChange={runImportPdf} style={{ display: 'none' }} />
      <div style={{ marginBottom: '12px' }}>
        <button onClick={() => pdfInputRef.current && pdfInputRef.current.click()} disabled={parsing} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', cursor: parsing ? 'default' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-soft)', padding: '10px 16px', width: '100%', justifyContent: 'center' }}>
          <EDM.Icon name="upload" size={14} /> {parsing ? 'Reading…' : 'Upload a PDF'}
        </button>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 10px' }}>or paste text</div>
      <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={9} placeholder="Paste CV text here…" style={{ ...EDM_FIELD, resize: 'vertical' }} />
      {importHint && <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--danger)' }}>{importHint}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
        <EDM.Button variant="ghost" onClick={onClose}>Cancel</EDM.Button>
        <EDM.Button variant="primary" disabled={parsing || !importText.trim()} onClick={runImport}>{parsing ? 'Parsing…' : 'Parse & fill'}</EDM.Button>
      </div>
    </EdmModalShell>
  );
}

/* ---- ATS check: score the résumé against a pasted job ad ---- */
function AtsModal({ talentId, onClose }) {
  const [jobText, setJobText] = React.useState('');
  const [ats, setAts] = React.useState(null);
  const [scoring, setScoring] = React.useState(false);
  const runAts = async () => {
    if (!jobText.trim() || !talentId) return;
    setScoring(true);
    try {
      setAts(await window.RecruitApi.atsScore(talentId, jobText));
    } catch {
      /* ignore */
    }
    setScoring(false);
  };

  return (
    <EdmModalShell title="ATS match check" subtitle="Paste the job ad — the AI scores this résumé against it and suggests fixes." onClose={onClose}>
      <textarea value={jobText} onChange={(e) => setJobText(e.target.value)} rows={7} placeholder="Paste the job description…" style={{ ...EDM_FIELD, resize: 'vertical' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
        <EDM.Button variant="ghost" onClick={onClose}>Close</EDM.Button>
        <EDM.Button variant="primary" disabled={scoring || !jobText.trim()} onClick={runAts}>{scoring ? 'Analyzing…' : 'Analyze'}</EDM.Button>
      </div>
      {ats && (
        <div style={{ marginTop: '18px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: 700, color: ats.score >= 75 ? 'var(--positive, #1F8A5B)' : ats.score >= 50 ? 'var(--accent-strong)' : 'var(--danger)' }}>{ats.score}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>/ 100 match</span>
            <span style={{ marginLeft: 'auto' }}><EdmProviderBadge provider={ats.provider} usage={ats.usage} /></span>
          </div>
          {ats.matched && ats.matched.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '5px' }}>Matched</div>
              <div>{ats.matched.map((m, i) => <span key={i} style={{ display: 'inline-block', background: 'var(--accent-soft)', color: 'var(--accent-strong)', borderRadius: '4px', padding: '2px 8px', margin: '0 5px 5px 0', fontSize: '12px' }}>{m}</span>)}</div>
            </div>
          )}
          {ats.missing && ats.missing.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '5px' }}>Missing</div>
              <div>{ats.missing.map((m, i) => <span key={i} style={{ display: 'inline-block', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: '4px', padding: '2px 8px', margin: '0 5px 5px 0', fontSize: '12px' }}>{m}</span>)}</div>
            </div>
          )}
          {ats.suggestions && ats.suggestions.length > 0 && (
            <ul style={{ margin: '10px 0 0', paddingLeft: '18px', fontSize: '13px', color: 'var(--text-body)' }}>
              {ats.suggestions.map((s, i) => <li key={i} style={{ margin: '3px 0' }}>{s}</li>)}
            </ul>
          )}
        </div>
      )}
    </EdmModalShell>
  );
}

/* ---- Pitch: a "why this candidate" short profile to present to the client ---- */
function PitchModal({ talentId, onClose }) {
  const [mandateContext, setMandateContext] = React.useState('');
  const [pitch, setPitch] = React.useState(null);
  const [pitching, setPitching] = React.useState(false);
  const [pitchCopied, setPitchCopied] = React.useState(false);
  const runPitch = async () => {
    if (!talentId) return;
    setPitching(true);
    try {
      setPitch(await window.RecruitApi.pitchCandidate(talentId, mandateContext));
    } catch {
      /* ignore */
    }
    setPitching(false);
  };
  const copyPitch = async () => {
    if (!pitch) return;
    const text = [pitch.headline, '', ...pitch.paragraphs, '', ...pitch.highlights.map((h) => `• ${h}`)]
      .join('\n')
      .trim();
    try {
      await navigator.clipboard.writeText(text);
      setPitchCopied(true);
      setTimeout(() => setPitchCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <EdmModalShell title="Candidate pitch" subtitle="A short “why this candidate” profile to present to the client. Add the mandate/role for a tailored pitch (optional)." onClose={onClose}>
      <textarea value={mandateContext} onChange={(e) => setMandateContext(e.target.value)} rows={5} placeholder="Mandate / role context (optional)…" style={{ ...EDM_FIELD, resize: 'vertical' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
        <EDM.Button variant="ghost" onClick={onClose}>Close</EDM.Button>
        <EDM.Button variant="primary" disabled={pitching} onClick={runPitch}>{pitching ? 'Drafting…' : pitch ? 'Regenerate' : 'Generate'}</EDM.Button>
      </div>
      {pitch && (
        <div style={{ marginTop: '18px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)' }}>{pitch.headline}</div>
            <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <EdmProviderBadge provider={pitch.provider} usage={pitch.usage} />
              <EdmPillButton icon={pitchCopied ? 'check' : 'fileText'} onClick={copyPitch}>{pitchCopied ? 'Copied' : 'Copy'}</EdmPillButton>
            </span>
          </div>
          {pitch.paragraphs.map((p, i) => (
            <p key={i} style={{ margin: '10px 0 0', fontSize: '13px', lineHeight: 1.55, color: 'var(--text-body)' }}>{p}</p>
          ))}
          {pitch.highlights && pitch.highlights.length > 0 && (
            <ul style={{ margin: '12px 0 0', paddingLeft: '18px', fontSize: '13px', color: 'var(--text-body)' }}>
              {pitch.highlights.map((h, i) => <li key={i} style={{ margin: '3px 0' }}>{h}</li>)}
            </ul>
          )}
          <EdmGroundingWarning grounding={pitch.grounding} />
        </div>
      )}
    </EdmModalShell>
  );
}

/* ---- Outreach: first-contact message (to candidate or client, email/LinkedIn) ---- */
function OutreachModal({ talentId, defaultEmail, onClose }) {
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  const [outAudience, setOutAudience] = React.useState('candidate'); // candidate | client
  const [outChannel, setOutChannel] = React.useState('email'); // email | linkedin
  const [outTone, setOutTone] = React.useState('');
  const [outContext, setOutContext] = React.useState('');
  const [outMsg, setOutMsg] = React.useState(null);
  const [outBusy, setOutBusy] = React.useState(false);
  const [outCopied, setOutCopied] = React.useState(false);
  // The outcome loop: this talent's past outreach + the desk's hit rate.
  const [history, setHistory] = React.useState([]);
  const [replyRate, setReplyRate] = React.useState(null);
  // Email integration: whether the server can send / watch for replies.
  const [mailStatus, setMailStatus] = React.useState(null);
  const [sendState, setSendState] = React.useState('idle'); // idle | sending | sent | error
  const [syncNote, setSyncNote] = React.useState('');
  React.useEffect(() => {
    window.RecruitApi.getMailStatus().then(setMailStatus).catch(() => {});
  }, []);
  const loadLoop = React.useCallback(() => {
    if (!talentId) return;
    window.RecruitApi.listArtifacts(talentId)
      .then((all) => setHistory(all.filter((a) => a.kind === 'outreach')))
      .catch(() => {});
    window.RecruitApi.getArtifactStats()
      .then((s) => {
        const outreach = (s.byKind || []).find((b) => b.kind === 'outreach');
        setReplyRate(outreach || null);
      })
      .catch(() => {});
  }, [talentId]);
  React.useEffect(loadLoop, [loadLoop]);
  const stampOutcome = (id, outcome) => {
    window.RecruitApi.setArtifactOutcome(id, outcome).then(loadLoop).catch(() => {});
  };
  const runOutreach = async () => {
    if (!talentId) return;
    setOutBusy(true);
    setOutCopied(false);
    setSendState('idle');
    try {
      setOutMsg(
        await window.RecruitApi.outreachMessage(talentId, {
          audience: outAudience,
          channel: outChannel,
          tone: outTone,
          mandateContext: outContext,
        }),
      );
      loadLoop(); // the generation was logged for the outcome loop
    } catch {
      /* ignore */
    }
    setOutBusy(false);
  };
  const copyOutreach = async () => {
    if (!outMsg) return;
    const text = [outMsg.subject && `Subject: ${outMsg.subject}`, outMsg.body]
      .filter(Boolean)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setOutCopied(true);
      setTimeout(() => setOutCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };
  const sendOutreachMail = async () => {
    if (!outMsg || !defaultEmail || sendState === 'sending') return;
    setSendState('sending');
    try {
      await window.RecruitApi.sendOutreach(talentId, {
        subject: outMsg.subject || 'Your next role',
        body: outMsg.body,
      });
      setSendState('sent');
      loadLoop();
    } catch {
      setSendState('error');
    }
  };
  const checkReplies = async () => {
    setSyncNote('Checking…');
    try {
      const res = await window.RecruitApi.syncMailReplies();
      setSyncNote(res.replies > 0 ? `${res.replies} repl${res.replies === 1 ? 'y' : 'ies'} found` : 'No new replies');
      loadLoop();
    } catch {
      setSyncNote('Check failed');
    }
    setTimeout(() => setSyncNote(''), 4000);
  };
  const openOutreachMail = () => {
    if (!outMsg) return;
    const to = outChannel === 'email' && outAudience === 'candidate' ? defaultEmail || '' : '';
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      outMsg.subject || '',
    )}&body=${encodeURIComponent(outMsg.body || '')}`;
    window.open(url, '_blank');
  };

  const pill = (active, onClick, label) => (
    <button onClick={onClick} style={{ flex: 1, padding: '7px 10px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, background: active ? 'var(--surface-card)' : 'transparent', color: active ? 'var(--text-heading)' : 'var(--text-soft)', boxShadow: active ? 'var(--shadow-xs)' : 'none' }}>{label}</button>
  );
  const toggle = (children) => (
    <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-md)', padding: '4px' }}>{children}</div>
  );

  return (
    <EdmModalShell title="Outreach message" subtitle="Draft the first-contact message — to the candidate (sourcing) or to a client (presenting the candidate), as an email or a LinkedIn DM." subtitleGap="14px" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '5px' }}>To</div>
          {toggle(<>{pill(outAudience === 'candidate', () => setOutAudience('candidate'), 'Candidate')}{pill(outAudience === 'client', () => setOutAudience('client'), 'Client')}</>)}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '5px' }}>Channel</div>
          {toggle(<>{pill(outChannel === 'email', () => setOutChannel('email'), 'Email')}{pill(outChannel === 'linkedin', () => setOutChannel('linkedin'), 'LinkedIn')}</>)}
        </div>
      </div>
      <input value={outTone} onChange={(e) => setOutTone(e.target.value)} placeholder='Tone (optional), e.g. casual ("Du") or formal ("Sie")' style={{ ...EDM_FIELD, padding: '9px 12px', marginBottom: '10px' }} />
      <textarea value={outContext} onChange={(e) => setOutContext(e.target.value)} rows={4} placeholder="Mandate / role context (optional)…" style={{ ...EDM_FIELD, resize: 'vertical' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
        <EDM.Button variant="ghost" onClick={onClose}>Close</EDM.Button>
        <EDM.Button variant="primary" disabled={outBusy} onClick={runOutreach}>{outBusy ? 'Drafting…' : outMsg ? 'Regenerate' : 'Generate'}</EDM.Button>
      </div>
      {outMsg && (
        <div style={{ marginTop: '18px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px' }}>
            <EdmProviderBadge provider={outMsg.provider} usage={outMsg.usage} />
            {outChannel === 'email' && outAudience === 'candidate' && defaultEmail && (
              <EdmPillButton icon={sendState === 'sent' ? 'check' : 'send'} onClick={sendOutreachMail}>
                {sendState === 'sending' ? 'Sending…' : sendState === 'sent' ? `Sent to ${defaultEmail}` : sendState === 'error' ? 'Send failed — retry' : 'Send email'}
              </EdmPillButton>
            )}
            {outChannel === 'email' && (
              <EdmPillButton icon="send" onClick={openOutreachMail}>Open in email</EdmPillButton>
            )}
            <EdmPillButton icon={outCopied ? 'check' : 'fileText'} onClick={copyOutreach}>{outCopied ? 'Copied' : 'Copy'}</EdmPillButton>
          </div>
          {outMsg.subject && (
            <div style={{ fontSize: '13px', color: 'var(--text-heading)', marginBottom: '8px' }}><strong>Subject:</strong> {outMsg.subject}</div>
          )}
          <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.55, color: 'var(--text-body)' }}>{outMsg.body}</div>
          <EdmGroundingWarning grounding={outMsg.grounding} />
        </div>
      )}

      {/* The outcome loop: what past outreach achieved, and stamping new fates.
          Honest by design — the rate only counts resolved messages. */}
      {(history.length > 0 || (replyRate && replyRate.replyRate !== null)) && (
        <div style={{ marginTop: '18px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Outcome loop</span>
            {replyRate && replyRate.replyRate !== null && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                Your desk: {replyRate.replied + replyRate.converted} of {replyRate.replied + replyRate.noReply + replyRate.converted} resolved outreach got a reply ({replyRate.replyRate}%)
              </span>
            )}
            {mailStatus && mailStatus.replySync && (
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                {syncNote && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)' }}>{syncNote}</span>}
                <EdmPillButton onClick={checkReplies}>Check replies</EdmPillButton>
              </span>
            )}
          </div>
          {history.slice(0, 5).map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>
                {new Date(a.createdAt).toLocaleDateString('en-GB')} · {a.channel} · {a.audience} · {a.provider}
              </span>
              <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '6px' }}>
                {a.outcome === 'pending' ? (
                  <>
                    <EdmPillButton onClick={() => stampOutcome(a.id, 'replied')}>Replied</EdmPillButton>
                    <EdmPillButton onClick={() => stampOutcome(a.id, 'no-reply')}>No reply</EdmPillButton>
                  </>
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: a.outcome === 'no-reply' ? 'var(--text-muted)' : 'var(--positive, #1F8A5B)' }}>{a.outcome}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </EdmModalShell>
  );
}

Object.assign(window, { ImportCvModal, AtsModal, PitchModal, OutreachModal });

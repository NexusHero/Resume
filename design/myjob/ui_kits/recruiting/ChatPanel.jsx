/* ChatPanel.jsx — the Chat-Agent panel (ADR-0062). Renders a streaming chat over
   `RecruitApi.agentChat` (SSE), tool-step chips with links to the created drafts,
   an abort button, an honest usage/cost footer, a limit summary, and a deletable
   session list. Provider-honest: for Gemini it shows "Antwort erscheint pro
   Runde" instead of pretending to stream token-by-token (Owner Q1). */
(function () {
  function toolLabel(name) {
    const labels = {
      search_jobs: 'Stellen suchen',
      save_job: 'Stelle speichern',
      list_mandanten: 'Mandanten laden',
      assess_fit: 'Passung prüfen',
      create_application: 'Bewerbung anlegen',
      list_applications: 'Bewerbungen laden',
      generate_letter: 'Anschreiben erzeugen',
      tailor_section: 'Abschnitt anpassen',
      tailor_all: 'Alles anpassen',
    };
    return labels[name] || name;
  }

  function ChatPanel({ onClose, onOpenApplication }) {
    const [sessions, setSessions] = React.useState([]);
    const [activeId, setActiveId] = React.useState(null);
    const [items, setItems] = React.useState([]);
    const [input, setInput] = React.useState('');
    const [running, setRunning] = React.useState(false);
    const [usage, setUsage] = React.useState(null);
    const [limit, setLimit] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [drafts, setDrafts] = React.useState([]);
    const abortRef = React.useRef(null);

    const aiStatus = window.useAiStatus ? window.useAiStatus() : { provider: null };
    const isGemini = aiStatus.provider === 'gemini';

    const reloadSessions = React.useCallback(() => {
      window.RecruitApi.agentListSessions()
        .then(setSessions)
        .catch(() => setSessions([]));
    }, []);
    React.useEffect(() => {
      reloadSessions();
    }, [reloadSessions]);

    const append = (item) => setItems((prev) => [...prev, item]);
    const patchLast = (fn) =>
      setItems((prev) => {
        if (prev.length === 0) return prev;
        const next = prev.slice();
        next[next.length - 1] = fn(next[next.length - 1]);
        return next;
      });

    const send = async () => {
      const message = input.trim();
      if (!message || running) return;
      setInput('');
      setError(null);
      setUsage(null);
      setLimit(null);
      setDrafts([]);
      setRunning(true);
      append({ kind: 'user', text: message });
      append({ kind: 'assistant', text: '', streaming: true });
      const controller = new AbortController();
      abortRef.current = controller;
      let draftsSeen = [];
      try {
        await window.RecruitApi.agentChat(
          { sessionId: activeId || undefined, message },
          (ev) => {
            switch (ev.name) {
              case 'session':
                setActiveId(ev.data.sessionId);
                break;
              case 'text':
                patchLast((m) => ({ ...m, text: (m.text || '') + ev.data.delta }));
                break;
              case 'tool-call':
                append({ kind: 'tool', name: ev.data.name, ok: null });
                break;
              case 'tool-result':
                patchLast((m) => (m.kind === 'tool' ? { ...m, ok: true } : m));
                break;
              case 'tool-error':
                patchLast((m) =>
                  m.kind === 'tool' ? { ...m, ok: false, detail: ev.data.detail } : m,
                );
                break;
              case 'drafts':
                draftsSeen = ev.data || [];
                setDrafts(draftsSeen);
                break;
              case 'usage':
                setUsage(ev.data);
                break;
              case 'limit':
                setLimit(ev.data);
                break;
              case 'error':
                setError(ev.data.detail || 'Unbekannter Fehler');
                break;
              case 'done':
              case 'aborted':
                break;
              default:
                break;
            }
          },
          controller.signal,
        );
      } catch (err) {
        if (err && err.name === 'AbortError') {
          /* user-initiated abort — no error banner */
        } else if (err && err.code === 'ai-not-configured') {
          setError('KI nicht eingerichtet — konfiguriere einen Server-Schlüssel.');
        } else {
          setError((err && err.message) || 'Der Agent-Lauf ist fehlgeschlagen.');
        }
      } finally {
        patchLast((m) => (m.streaming ? { ...m, streaming: false } : m));
        setRunning(false);
        abortRef.current = null;
        reloadSessions();
      }
    };

    const abort = () => {
      if (abortRef.current) abortRef.current.abort();
      if (activeId) window.RecruitApi.agentAbort(activeId).catch(() => {});
    };

    const openSession = (id) => {
      setActiveId(id);
      setItems([]);
      setError(null);
      setUsage(null);
      setLimit(null);
      window.RecruitApi.agentGetSession(id)
        .then((session) => {
          const mapped = [];
          for (const m of session.messages || []) {
            if (m.role === 'user') mapped.push({ kind: 'user', text: m.text || '' });
            else if (m.role === 'assistant' && m.text !== undefined)
              mapped.push({ kind: 'assistant', text: m.text, streaming: false });
            else if (m.role === 'assistant' && m.toolCall)
              mapped.push({ kind: 'tool', name: m.toolCall.name, ok: null });
            else if (m.role === 'tool' && m.toolResult)
              mapped.push({
                kind: 'tool',
                name: m.toolResult.name,
                ok: !m.toolResult.isError,
              });
            else if (m.role === 'system') mapped.push({ kind: 'system', text: m.text || '' });
          }
          setItems(mapped);
          setUsage(session.usage);
        })
        .catch(() => setError('Verlauf konnte nicht geladen werden.'));
    };

    const removeSession = async (id) => {
      await window.RecruitApi.agentDeleteSession(id);
      if (activeId === id) {
        setActiveId(null);
        setItems([]);
      }
      reloadSessions();
    };

    const openDraft = (draft) => {
      if (onOpenApplication) onOpenApplication(draft);
    };

    return (
      <div
        data-testid="chat-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          height: '100%',
          minHeight: 0,
        }}
      >
        {sessions.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {sessions.map((s) => (
              <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  data-testid="session-chip"
                  onClick={() => openSession(s.id)}
                  style={{
                    cursor: 'pointer',
                    border: `1px solid ${s.id === activeId ? 'var(--accent-strong)' : 'var(--border)'}`,
                    background: 'none',
                    borderRadius: 'var(--radius-pill)',
                    padding: '4px 10px',
                    fontSize: '12px',
                    color: 'var(--text-body)',
                  }}
                >
                  {s.title || s.id}
                </button>
                <button
                  type="button"
                  data-testid="session-delete"
                  aria-label={`Verlauf ${s.title || s.id} löschen`}
                  onClick={() => removeSession(s.id)}
                  style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-soft)', fontSize: '13px' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div
          data-testid="chat-messages"
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            paddingRight: '4px',
          }}
        >
          {items.length === 0 && !running && (
            <div style={{ fontSize: '13px', color: 'var(--text-soft)', textAlign: 'center', padding: '24px 8px' }}>
              Frag den Agenten — er sucht Stellen, legt Bewerbungs-Entwürfe an und passt Anschreiben an.
            </div>
          )}
          {items.map((m, i) => (
            <div
              key={i}
              data-testid={`chat-${m.kind}`}
              style={{
                alignSelf: m.kind === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '86%',
                padding: m.kind === 'user' ? '8px 12px' : '8px 0',
                borderRadius: 'var(--radius-md)',
                background: m.kind === 'user' ? 'var(--accent-soft, rgba(42,111,219,0.10))' : 'transparent',
                fontSize: '13.5px',
                lineHeight: 1.55,
                color: 'var(--text-body)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {m.kind === 'tool' ? (
                <span
                  data-testid="tool-chip"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    color: m.ok === false ? 'var(--danger)' : 'var(--text-body)',
                  }}
                >
                  {m.ok === null ? '…' : m.ok ? '✓' : '⚠'} {toolLabel(m.name)}
                </span>
              ) : m.kind === 'system' ? (
                <span style={{ fontSize: '12px', color: 'var(--text-soft)', fontStyle: 'italic' }}>{m.text}</span>
              ) : (
                <span>
                  {m.text}
                  {m.streaming && <span data-testid="streaming-caret"> ▍</span>}
                </span>
              )}
            </div>
          ))}
          {drafts.length > 0 && (
            <div data-testid="draft-links" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {drafts.map((d) => (
                <button
                  key={d.jobApplicationId}
                  type="button"
                  data-testid="draft-link"
                  onClick={() => openDraft(d)}
                  style={{
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    textAlign: 'left',
                    fontSize: '13px',
                    color: 'var(--accent-strong)',
                    textDecoration: 'underline',
                  }}
                >
                  Entwurf öffnen: {d.postingCompany} – {d.postingTitle}
                </button>
              ))}
            </div>
          )}
          {limit && (
            <div
              data-testid="limit-summary"
              role="status"
              style={{ fontSize: '12.5px', color: 'var(--text-soft)', fontStyle: 'italic' }}
            >
              {limit.summary}
            </div>
          )}
          {error && (
            <div
              data-testid="chat-error"
              role="alert"
              style={{ fontSize: '12.5px', color: 'var(--danger)', padding: '6px 0' }}
            >
              {error}
            </div>
          )}
        </div>

        {usage && (
          <div
            data-testid="usage-footer"
            style={{ fontSize: '11.5px', color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' }}
          >
            {usage.inputTokens} in · {usage.outputTokens} out ·{' '}
            {usage.costUsd < 0.01 ? '< $0.01' : `$${usage.costUsd.toFixed(2)}`}
          </div>
        )}

        {isGemini && (
          <div
            data-testid="gemini-hint"
            style={{ fontSize: '11.5px', color: 'var(--text-soft)', fontStyle: 'italic' }}
          >
            Antwort erscheint pro Runde
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            data-testid="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Nachricht an den Agenten …"
            disabled={running}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface, transparent)',
              color: 'var(--text-body)',
              fontSize: '13.5px',
            }}
          />
          {running ? (
            <button
              type="button"
              data-testid="chat-abort"
              onClick={abort}
              style={{
                cursor: 'pointer',
                border: '1px solid var(--border)',
                background: 'none',
                color: 'var(--text-body)',
                borderRadius: 'var(--radius-md)',
                padding: '9px 14px',
                fontSize: '13px',
              }}
            >
              Abbrechen
            </button>
          ) : (
            <button
              type="button"
              data-testid="chat-send"
              onClick={send}
              style={{
                cursor: 'pointer',
                border: 'none',
                background: 'var(--accent-strong, #1d4ed8)',
                color: '#fff',
                borderRadius: 'var(--radius-md)',
                padding: '9px 14px',
                fontSize: '13px',
              }}
            >
              Senden
            </button>
          )}
        </div>
      </div>
    );
  }

  window.ChatPanel = ChatPanel;
})();

/* Pure merge for the text-only CV import ("Text übernehmen (ohne KI)").
   Existing profile, contact, experience, education and skills are never
   overwritten; only empty fields are filled (plan §3.6/§4.4). */
(function () {
  const empty = (v) => v == null || (typeof v === 'string' && v.trim() === '');

  function mergeTextImport(current, imported) {
    const cur = current || {};
    const next = { ...cur };
    const imp = imported || {};

    // Contact: fill empty fields only.
    next.contact = { ...(cur.contact || {}) };
    for (const [k, v] of Object.entries(imp.contact || {})) {
      if (empty(next.contact[k]) && !empty(v)) next.contact[k] = v;
    }

    next.resume = { ...(cur.resume || {}) };
    // Summary is never written by the text mode; keep an existing one.
    if (empty(next.resume.summary) && !empty(imp.resume && imp.resume.summary)) {
      next.resume.summary = imp.resume.summary;
    }
    // rawText: keep an existing import; only fill when empty.
    const incomingRaw = imp.resume && imp.resume.rawText;
    if (empty(next.resume.rawText) && !empty(incomingRaw)) next.resume.rawText = incomingRaw;

    // Structured sections are AI-only: never replace an existing list.
    next.resume.experience = Array.isArray(next.resume.experience) ? next.resume.experience : [];
    next.resume.education = Array.isArray(next.resume.education) ? next.resume.education : [];
    next.resume.skillGroups = Array.isArray(next.resume.skillGroups) ? next.resume.skillGroups : [];
    return next;
  }

  window.mergeTextImport = mergeTextImport;
})();

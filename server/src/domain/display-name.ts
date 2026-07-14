/**
 * Derive a friendly display name from an email's local part when no real name
 * is on file (a bootstrap-account talent, or the recruiter's own "me" profile).
 * "suhay.sevinc@…" → "Suhay Sevinc". Drops any plus-address subaddress first
 * ("recruiter+test@…" → "Recruiter", not "Recruiter+"), and keeps only letters
 * per word so digits/symbols never leak into the greeting.
 *
 * The recruiting SPA (`app.jsx`'s `makeMeProfile`) implements this same
 * algorithm client-side for the same purpose — the two cannot share this
 * module directly (a separate, unbundled browser runtime), so keep them in
 * sync by hand if this changes; both carry a comment pointing at the other.
 */
export function deriveDisplayNameFromEmail(email: string): string {
  return email
    .split('@')[0]!
    .split('+')[0]!
    .split(/[._-]+/)
    .map((w) => w.replace(/[^\p{L}]/gu, ''))
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

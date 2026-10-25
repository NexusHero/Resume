import { emailVerificationEmail } from '../../src/domain/email-verification.js';
import { passwordResetEmail } from '../../src/domain/password-reset.js';

/* Phase 7 (ADR-0064, AK-7.6): the fixed verification/reset mail templates are
   English. This guards against a German fragment creeping back into the fixed
   subject/body constants (the outreach mail body is generated per the ad
   language, FR-42, and is deliberately out of scope). */
const GERMAN_FRAGMENTS = [
  /[äöüÄÖÜß]/,
  /\b(passwort|konto|bestätigen|bestätigung|zurücksetzen|gültig|klicken|ihre|ihnen|wurde|wird|dass|deine|dein|bitte)\b/i,
];

function mailBlob(email: { subject: string; text: string; html: string }): string {
  return `${email.subject}\n${email.text}\n${email.html}`;
}

describe('english-only mail templates (AK-7.6)', () => {
  it('EmailVerification_SubjectAndBody_ContainNoGermanFragments', () => {
    const email = emailVerificationEmail('https://app.example/verify', 30);
    const blob = mailBlob(email);
    for (const pattern of GERMAN_FRAGMENTS) {
      expect(blob).not.toMatch(pattern);
    }
    expect(email.subject).toBe('Confirm your myJob email address');
  });

  it('PasswordReset_SubjectAndBody_ContainNoGermanFragments', () => {
    const email = passwordResetEmail('https://app.example/reset', 30);
    const blob = mailBlob(email);
    for (const pattern of GERMAN_FRAGMENTS) {
      expect(blob).not.toMatch(pattern);
    }
    expect(email.subject).toBe('Reset your myJob password');
  });
});

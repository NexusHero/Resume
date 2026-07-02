import { z } from 'zod';

/**
 * Soft email verification: prove the address behind an account is real.
 * "Soft" because nothing is locked while unverified — the app is offline-first
 * and SMTP may not be configured — but the state is visible (Settings shows a
 * banner) and downstream features can require it later.
 */

/** POST /api/v1/auth/verify-email/confirm — mark the account verified. */
export const confirmVerificationSchema = z.object({
  token: z.string().min(1, 'a verification token is required'),
});
export type ConfirmVerificationInput = z.infer<typeof confirmVerificationSchema>;

/** A one-time verification token: an opaque value bound to a user, with a creation time. */
export interface EmailVerificationToken {
  token: string;
  userId: string;
  createdAt: string; // ISO 8601
}

/**
 * Builds the link the user clicks. The token rides in the query string; the
 * recruiting kit reads `verify_token` on load and confirms it.
 */
export function emailVerificationUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/design/myjob/ui_kits/recruiting/dist/index.html?verify_token=${encodeURIComponent(
    token,
  )}`;
}

/**
 * The verification email body (plain text + HTML). Pure and deterministic so it
 * can be asserted in tests; the transport (console/SMTP) is a separate concern.
 */
export function emailVerificationEmail(
  verifyUrl: string,
  ttlMinutes: number,
): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = 'Confirm your myJob email address';
  const text = [
    'Welcome to myJob!',
    '',
    `Open this link to confirm your email address (valid for ${ttlMinutes} minutes):`,
    verifyUrl,
    '',
    "If you didn't create this account, you can safely ignore this email.",
  ].join('\n');
  const html = [
    '<p>Welcome to <strong>myJob</strong>!</p>',
    `<p>Click the button below to confirm your email address (valid for ${ttlMinutes} minutes):</p>`,
    `<p><a href="${verifyUrl}" style="display:inline-block;padding:10px 18px;background:#2A6FDB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Confirm email</a></p>`,
    `<p style="color:#6b7280;font-size:13px">Or open this link: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
    '<p style="color:#6b7280;font-size:13px">If you didn&rsquo;t create this account, you can safely ignore this email.</p>',
  ].join('\n');
  return { subject, text, html };
}

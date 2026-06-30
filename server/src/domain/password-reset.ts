import { z } from 'zod';

const email = z
  .string()
  .trim()
  .email('a valid email is required')
  .transform((s) => s.toLowerCase());

/** POST /api/v1/auth/password-reset/request — ask for a reset link. */
export const requestResetSchema = z.object({ email });
export type RequestResetInput = z.infer<typeof requestResetSchema>;

/** POST /api/v1/auth/password-reset/confirm — set a new password with a token. */
export const confirmResetSchema = z.object({
  token: z.string().min(1, 'a reset token is required'),
  password: z.string().min(8, 'password must be at least 8 characters'),
});
export type ConfirmResetInput = z.infer<typeof confirmResetSchema>;

/** A one-time password-reset token: an opaque value bound to a user, with a creation time. */
export interface PasswordResetToken {
  token: string;
  userId: string;
  createdAt: string; // ISO 8601
}

/**
 * Builds the reset link the user clicks. The token rides in the query string;
 * the recruiting kit reads `reset_token` on load to show the new-password form.
 */
export function passwordResetUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/design/myjob/ui_kits/recruiting/dist/index.html?reset_token=${encodeURIComponent(
    token,
  )}`;
}

/**
 * The reset email body (plain text + HTML). Pure and deterministic so it can be
 * asserted in tests; the transport (console/SMTP) is a separate concern.
 */
export function passwordResetEmail(
  resetUrl: string,
  ttlMinutes: number,
): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = 'Reset your myJob password';
  const text = [
    'You requested a password reset for your myJob account.',
    '',
    `Open this link to choose a new password (valid for ${ttlMinutes} minutes):`,
    resetUrl,
    '',
    "If you didn't request this, you can safely ignore this email — your password stays unchanged.",
  ].join('\n');
  const html = [
    '<p>You requested a password reset for your <strong>myJob</strong> account.</p>',
    `<p>Choose a new password (valid for ${ttlMinutes} minutes):</p>`,
    `<p><a href="${resetUrl}">Reset my password</a></p>`,
    "<p>If you didn't request this, you can safely ignore this email — your password stays unchanged.</p>",
  ].join('\n');
  return { subject, text, html };
}

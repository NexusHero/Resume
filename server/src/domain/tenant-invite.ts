import { z } from 'zod';
import { roleSchema, type Role } from './user.js';

/**
 * A tenant invitation (ADR-0035). An admin invites an email address into their
 * own tenant with a set of roles; the invitee accepts by choosing a password,
 * which creates their account already bound to that tenant. This is how a user
 * acquires a non-default `tenantId` — the seam ADR-0033/0034 left open.
 *
 * The token is an opaque single-use secret (never shown in list projections);
 * the invite expires after a configured TTL.
 */
export interface TenantInvite {
  token: string;
  email: string; // lowercased; the acceptor's email must match
  tenantId: string;
  roles: Role[];
  invitedBy: string; // the admin's user id
  createdAt: string; // ISO 8601
}

/** The public projection of a pending invite — no token (it's a secret). */
export interface TenantInviteView {
  email: string;
  roles: Role[];
  invitedBy: string;
  createdAt: string;
}

export function toInviteView(i: TenantInvite): TenantInviteView {
  return { email: i.email, roles: i.roles, invitedBy: i.invitedBy, createdAt: i.createdAt };
}

const emailField = z
  .string()
  .trim()
  .email('a valid email is required')
  .transform((s) => s.toLowerCase());

/** POST /api/v1/members/invites — an admin invites an email with roles. */
export const createInviteSchema = z.object({
  email: emailField,
  roles: z.array(roleSchema).min(1, 'at least one role is required'),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

/** POST /api/v1/auth/accept-invite — the invitee sets a password to join. */
export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'an invite token is required'),
  password: z.string().min(8, 'password must be at least 8 characters'),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

/**
 * The link the invitee clicks. The token rides in the query string; the
 * recruiting kit reads `invite_token` on load and shows the accept screen (a
 * follow-up UI slice — the link and token are stable regardless).
 */
export function tenantInviteUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/design/myjob/ui_kits/recruiting/dist/index.html?invite_token=${encodeURIComponent(
    token,
  )}`;
}

/**
 * The invitation email (plain text + HTML). Pure and deterministic so it can be
 * asserted in tests; the transport (console/SMTP) is a separate concern.
 */
export function tenantInviteEmail(
  acceptUrl: string,
  ttlHours: number,
): { subject: string; text: string; html: string } {
  const subject = 'You have been invited to a myJob workspace';
  const text = [
    'You have been invited to join a myJob workspace.',
    '',
    `Open this link to accept and set your password (valid for ${ttlHours} hours):`,
    acceptUrl,
    '',
    "If you weren't expecting this, you can safely ignore this email.",
  ].join('\n');
  const html = [
    '<p>You have been invited to join a <strong>myJob</strong> workspace.</p>',
    `<p>Click the button below to accept and set your password (valid for ${ttlHours} hours):</p>`,
    `<p><a href="${acceptUrl}" style="display:inline-block;padding:10px 18px;background:#2A6FDB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Accept invitation</a></p>`,
    `<p style="color:#6b7280;font-size:13px">Or open this link: <a href="${acceptUrl}">${acceptUrl}</a></p>`,
    '<p style="color:#6b7280;font-size:13px">If you weren&rsquo;t expecting this, you can safely ignore this email.</p>',
  ].join('\n');
  return { subject, text, html };
}

import { AccountService } from '../../src/services/account-service.js';
import { toUserView } from '../../src/domain/user.js';
import type { UserErasureStep, UserExportSection } from '../../src/ports/personal-data.js';
import {
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  InMemoryPlacementRepository,
  InMemoryApiKeyStore,
  InMemoryUserRepository,
  InMemoryPasswordResetTokenStore,
  InMemoryEmailVerificationTokenStore,
  InMemoryUsageMeter,
  InMemoryInterviewObservationRepository,
  InMemoryArtifactLogRepository,
  FakeAuthEngine,
} from '../support/fakes.js';
import type { Mandate } from '../../src/domain/mandate.js';
import type { Talent } from '../../src/domain/talent.js';
import type { Placement } from '../../src/domain/placement.js';
import type { User } from '../../src/domain/user.js';

const USER = 'user1';
const TEAM = 'team';
const TS = '2026-06-30T12:00:00.000Z';

/**
 * Mirrors the composition root's personal-data registry (container.ts) so the
 * test exercises the same erase/export wiring the app ships. Adding a store here
 * mirrors adding it there — a forgotten container fails a test, not production.
 */
function makeService() {
  const mandateRepository = new InMemoryMandateRepository();
  const talentRepository = new InMemoryTalentRepository();
  const placementRepository = new InMemoryPlacementRepository();
  const apiKeyStore = new InMemoryApiKeyStore();
  const userRepository = new InMemoryUserRepository();
  const authEngine = new FakeAuthEngine();
  const passwordResetTokenStore = new InMemoryPasswordResetTokenStore();
  const emailVerificationTokenStore = new InMemoryEmailVerificationTokenStore();
  const usageMeter = new InMemoryUsageMeter();
  const observationRepository = new InMemoryInterviewObservationRepository();
  const artifactLogRepository = new InMemoryArtifactLogRepository();

  const userErasureSteps: UserErasureStep[] = [
    {
      label: 'api-keys',
      erase: async (userId) => {
        for (const provider of await apiKeyStore.providersFor(userId)) {
          await apiKeyStore.remove(userId, provider);
        }
      },
    },
    {
      label: 'auth-credentials',
      erase: async (userId) => {
        const found = await userRepository.findById(userId);
        if (found) await authEngine.erase(found.email);
      },
    },
    {
      label: 'password-reset-tokens',
      erase: (userId) => passwordResetTokenStore.destroyForUser(userId),
    },
    {
      label: 'email-verification-tokens',
      erase: (userId) => emailVerificationTokenStore.destroyForUser(userId),
    },
    { label: 'usage', erase: (userId) => usageMeter.removeForUser(userId) },
  ];
  const userExportSections: UserExportSection[] = [
    {
      key: 'account',
      collect: async (userId) => {
        const user = await userRepository.findById(userId);
        return user ? toUserView(user) : null;
      },
    },
    { key: 'mandates', collect: (_userId, scope) => mandateRepository.list(scope) },
    { key: 'talents', collect: (_userId, scope) => talentRepository.list(scope) },
    { key: 'placements', collect: (_userId, scope) => placementRepository.list(scope) },
    { key: 'observations', collect: (_userId, scope) => observationRepository.list(scope) },
    { key: 'artifactLogs', collect: (_userId, scope) => artifactLogRepository.list(scope) },
  ];

  const service = new AccountService({ userRepository, userErasureSteps, userExportSections });
  return {
    service,
    mandateRepository,
    talentRepository,
    placementRepository,
    apiKeyStore,
    userRepository,
    authEngine,
    passwordResetTokenStore,
    emailVerificationTokenStore,
    usageMeter,
  };
}

const mandate = (id: string, ownerId = TEAM): Mandate => ({
  id,
  ownerId,
  client: 'Aurora',
  role: 'C++ Engineer',
  location: 'Berlin',
  fee: '',
  feeValue: '',
  deadline: '',
  priority: 'medium',
  status: 'active',
  submitted: 0,
  interviews: 0,
  createdAt: TS,
  updatedAt: TS,
});

const talent = (id: string, ownerId = TEAM): Talent => ({
  id,
  ownerId,
  name: 'Lena',
  role: '',
  headline: '',
  location: '',
  email: '',
  phone: '',
  availability: '',
  salary: '',
  skills: [],
  createdAt: TS,
  updatedAt: TS,
});

const placement = (id: string, ownerId = TEAM): Placement => ({
  id,
  ownerId,
  candidateName: 'Mara',
  candidateRole: '',
  client: 'Aurora',
  start: '',
  fee: '',
  status: 'probation',
  createdAt: TS,
  updatedAt: TS,
});

const user = (id: string): User => ({
  id,
  email: `${id}@example.com`,
  passwordHash: 'scrypt$salt$key',
  roles: ['recruiter'],
  createdAt: TS,
});

describe('AccountService', () => {
  it('ExportFor_ReturnsAccountPlusTeamWorkspace', async () => {
    const ctx = makeService();
    await ctx.userRepository.add(user(USER));
    await ctx.mandateRepository.add(mandate('m1'));
    await ctx.talentRepository.add(talent('t1'));
    await ctx.placementRepository.add(placement('p1'));

    const result = await ctx.service.exportFor(USER, TEAM, TS);

    expect(result.exportedAt).toBe(TS);
    expect(result.account).toMatchObject({ id: USER, email: 'user1@example.com' });
    expect(result.account).not.toHaveProperty('passwordHash'); // never leak the hash
    expect(result.mandates).toHaveLength(1);
    expect(result.talents).toHaveLength(1);
    expect(result.placements).toHaveLength(1);
  });

  it('ExportFor_IncludesEveryRegisteredSection', async () => {
    const ctx = makeService();
    await ctx.userRepository.add(user(USER));

    const result = await ctx.service.exportFor(USER, TEAM, TS);

    // The export payload carries one key per registered section — a new
    // personal-data container shows up here without touching AccountService.
    expect(Object.keys(result).sort()).toEqual(
      [
        'account',
        'artifactLogs',
        'exportedAt',
        'mandates',
        'observations',
        'placements',
        'talents',
      ].sort(),
    );
  });

  it('ExportFor_UnknownAccount_ReturnsNullAccount', async () => {
    const ctx = makeService();
    const result = await ctx.service.exportFor(USER, TEAM, TS);
    expect(result.account).toBeNull();
    expect(result.mandates).toEqual([]);
  });

  it('Erase_RemovesPersonalFootprint_LeavesTeamData', async () => {
    const ctx = makeService();
    await ctx.userRepository.add(user(USER));
    await ctx.mandateRepository.add(mandate('m1')); // team-owned
    await ctx.apiKeyStore.set(USER, 'claude', 'sk-personal');
    const { token } = await ctx.authEngine.signUp(`${USER}@example.com`, 'secret-pass');
    await ctx.passwordResetTokenStore.create(USER);
    await ctx.usageMeter.record({
      userId: USER,
      provider: 'claude',
      feature: 'ats',
      inputTokens: 10,
      outputTokens: 5,
      at: TS,
    });

    await ctx.service.erase(USER);

    // the person's own footprint is gone
    expect(await ctx.userRepository.findById(USER)).toBeNull();
    expect(await ctx.authEngine.resolve(token)).toBeNull(); // engine credential + session erased
    expect(ctx.passwordResetTokenStore.tokens).toEqual([]);
    expect(await ctx.apiKeyStore.providersFor(USER)).toEqual([]); // personal keys erased
    expect(await ctx.usageMeter.list(USER)).toEqual([]); // usage history erased
    // the shared team workspace stays
    expect(await ctx.mandateRepository.list(TEAM)).toHaveLength(1);
  });

  it('Erase_AlsoDestroysEmailVerificationTokens', async () => {
    const ctx = makeService();
    await ctx.userRepository.add(user(USER));
    await ctx.emailVerificationTokenStore.create(USER);
    await ctx.emailVerificationTokenStore.create('other'); // a different user's token stays

    await ctx.service.erase(USER);

    // Regression guard: verification tokens (and the invites hanging off them)
    // used to survive account deletion because erase never touched this store.
    expect(ctx.emailVerificationTokenStore.tokens.map((t) => t.userId)).toEqual(['other']);
  });

  it('Erase_AlreadyGoneAccount_IsNoOp', async () => {
    const ctx = makeService();
    await expect(ctx.service.erase('ghost')).resolves.toBeUndefined();
  });
});

import { AccountService } from '../../src/services/account-service';
import { MemorySessionStore } from '../../src/adapters/memory-session-store';
import {
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  InMemoryPlacementRepository,
  InMemoryApiKeyStore,
  InMemoryUserRepository,
  InMemoryPasswordResetTokenStore,
  InMemoryUsageMeter,
} from '../support/fakes';
import type { Mandate } from '../../src/domain/mandate';
import type { Talent } from '../../src/domain/talent';
import type { Placement } from '../../src/domain/placement';
import type { User } from '../../src/domain/user';

const USER = 'user1';
const TEAM = 'team';
const TS = '2026-06-30T12:00:00.000Z';

function makeService() {
  const mandateRepository = new InMemoryMandateRepository();
  const talentRepository = new InMemoryTalentRepository();
  const placementRepository = new InMemoryPlacementRepository();
  const apiKeyStore = new InMemoryApiKeyStore();
  const userRepository = new InMemoryUserRepository();
  const sessionStore = new MemorySessionStore();
  const passwordResetTokenStore = new InMemoryPasswordResetTokenStore();
  const usageMeter = new InMemoryUsageMeter();
  const service = new AccountService({
    mandateRepository,
    talentRepository,
    placementRepository,
    apiKeyStore,
    userRepository,
    sessionStore,
    passwordResetTokenStore,
    usageMeter,
  });
  return {
    service,
    mandateRepository,
    talentRepository,
    placementRepository,
    apiKeyStore,
    userRepository,
    sessionStore,
    passwordResetTokenStore,
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
    const token = await ctx.sessionStore.create(USER);
    await ctx.passwordResetTokenStore.create(USER);
    await ctx.usageMeter.record({
      ownerId: USER,
      provider: 'claude',
      feature: 'ats',
      inputTokens: 10,
      outputTokens: 5,
      at: TS,
    });

    await ctx.service.erase(USER);

    // the person's own footprint is gone
    expect(await ctx.userRepository.findById(USER)).toBeNull();
    expect(await ctx.sessionStore.userIdFor(token)).toBeNull();
    expect(ctx.passwordResetTokenStore.tokens).toEqual([]);
    expect(await ctx.apiKeyStore.providersFor(USER)).toEqual([]); // personal keys erased
    expect(await ctx.usageMeter.list(USER)).toEqual([]); // usage history erased
    // the shared team workspace stays
    expect(await ctx.mandateRepository.list(TEAM)).toHaveLength(1);
  });

  it('Erase_AlreadyGoneAccount_IsNoOp', async () => {
    const ctx = makeService();
    await expect(ctx.service.erase('ghost')).resolves.toBeUndefined();
  });
});

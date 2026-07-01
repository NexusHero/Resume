import { AccountService } from '../../src/services/account-service';
import { MemorySessionStore } from '../../src/adapters/memory-session-store';
import {
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  InMemoryPlacementRepository,
  InMemoryDocumentRepository,
  InMemoryAttachmentStore,
  InMemoryCandidacyRepository,
  InMemoryUserRepository,
  InMemoryPasswordResetTokenStore,
} from '../support/fakes';
import type { Mandate } from '../../src/domain/mandate';
import type { Talent } from '../../src/domain/talent';
import type { Placement } from '../../src/domain/placement';
import type { User } from '../../src/domain/user';

const OWNER = 'owner1';
const TS = '2026-06-30T12:00:00.000Z';

function makeService() {
  const mandateRepository = new InMemoryMandateRepository();
  const talentRepository = new InMemoryTalentRepository();
  const placementRepository = new InMemoryPlacementRepository();
  const documentRepository = new InMemoryDocumentRepository();
  const attachmentStore = new InMemoryAttachmentStore();
  const candidacyRepository = new InMemoryCandidacyRepository();
  const userRepository = new InMemoryUserRepository();
  const sessionStore = new MemorySessionStore();
  const passwordResetTokenStore = new InMemoryPasswordResetTokenStore();
  const service = new AccountService({
    mandateRepository,
    talentRepository,
    placementRepository,
    documentRepository,
    attachmentStore,
    candidacyRepository,
    userRepository,
    sessionStore,
    passwordResetTokenStore,
  });
  return {
    service,
    mandateRepository,
    talentRepository,
    placementRepository,
    documentRepository,
    attachmentStore,
    candidacyRepository,
    userRepository,
    sessionStore,
    passwordResetTokenStore,
  };
}

const mandate = (id: string, ownerId = OWNER): Mandate => ({
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

const talent = (id: string, ownerId = OWNER): Talent => ({
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

const placement = (id: string, ownerId = OWNER): Placement => ({
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
  createdAt: TS,
});

describe('AccountService', () => {
  it('ExportFor_ReturnsOnlyOwnedDataWithAccountAndTimestamp', async () => {
    const ctx = makeService();
    await ctx.userRepository.add(user(OWNER));
    await ctx.mandateRepository.add(mandate('m1'));
    await ctx.mandateRepository.add(mandate('m2', 'other'));
    await ctx.talentRepository.add(talent('t1'));
    await ctx.placementRepository.add(placement('p1'));

    const result = await ctx.service.exportFor(OWNER, TS);

    expect(result.exportedAt).toBe(TS);
    expect(result.account).toMatchObject({ id: OWNER, email: 'owner1@example.com' });
    expect(result.account).not.toHaveProperty('passwordHash'); // never leak the hash
    expect(result.mandates).toHaveLength(1);
    expect(result.talents).toHaveLength(1);
    expect(result.placements).toHaveLength(1);
  });

  it('ExportFor_UnknownAccount_ReturnsNullAccount', async () => {
    const ctx = makeService();
    const result = await ctx.service.exportFor(OWNER, TS);
    expect(result.account).toBeNull();
    expect(result.mandates).toEqual([]);
  });

  it('Erase_RemovesOwnedDataSessionsAndAccount_LeavesOthers', async () => {
    const ctx = makeService();
    await ctx.userRepository.add(user(OWNER));
    await ctx.mandateRepository.add(mandate('m1'));
    await ctx.mandateRepository.add(mandate('m2', 'other'));
    await ctx.talentRepository.add(talent('t1'));
    await ctx.placementRepository.add(placement('p1'));
    const token = await ctx.sessionStore.create(OWNER);
    await ctx.passwordResetTokenStore.create(OWNER);

    await ctx.service.erase(OWNER);

    expect(await ctx.mandateRepository.list(OWNER)).toEqual([]);
    expect(await ctx.talentRepository.list(OWNER)).toEqual([]);
    expect(await ctx.placementRepository.list(OWNER)).toEqual([]);
    expect(await ctx.userRepository.findById(OWNER)).toBeNull();
    expect(await ctx.sessionStore.userIdFor(token)).toBeNull();
    expect(ctx.passwordResetTokenStore.tokens).toEqual([]); // reset tokens erased too
    // another recruiter's mandate is untouched
    expect(await ctx.mandateRepository.list('other')).toHaveLength(1);
  });

  it('Erase_AlreadyGoneAccount_IsNoOp', async () => {
    const ctx = makeService();
    await expect(ctx.service.erase('ghost')).resolves.toBeUndefined();
  });
});

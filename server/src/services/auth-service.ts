import {
  type User,
  type UserView,
  type RegisterInput,
  type LoginInput,
  toUserView,
} from '../domain/user.js';
import { defaultWorkspaceName, type Tenant } from '../domain/tenant.js';
import { ConflictError, UnauthorizedError } from '../domain/errors.js';
import type { UserRepository } from '../ports/user-repository.js';
import type { SessionStore } from '../ports/session-store.js';
import type { PasswordHasher } from '../ports/password-hasher.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import type { TenantRepository } from '../ports/tenant-repository.js';
import type { AppConfig } from '../config.js';

export interface AuthServiceDeps {
  userRepository: UserRepository;
  sessionStore: SessionStore;
  passwordHasher: PasswordHasher;
  clock: Clock;
  idGenerator: IdGenerator;
  /** Optional (ADR-0036): present enables self-serve tenant creation on register. */
  tenantRepository?: TenantRepository;
  config?: AppConfig;
}

/** The result of a successful register/login: the public user + a session token. */
export interface AuthResult {
  user: UserView;
  token: string;
}

/** Email/password authentication with opaque server-side sessions. */
export class AuthService {
  private readonly users: UserRepository;
  private readonly sessions: SessionStore;
  private readonly hasher: PasswordHasher;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly tenants?: TenantRepository;
  private readonly selfServe: boolean;
  /** A throwaway hash, computed once, verified against on the unknown-email path
   *  so a missing account costs the same scrypt work as a wrong password. */
  private dummyHashCache?: Promise<string>;

  constructor(deps: AuthServiceDeps) {
    this.users = deps.userRepository;
    this.sessions = deps.sessionStore;
    this.hasher = deps.passwordHasher;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
    this.tenants = deps.tenantRepository;
    this.selfServe = deps.config?.selfServeTenants ?? false;
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictError('An account with this email already exists');

    // Self-serve (ADR-0036): each registration spins up its own workspace and the
    // registrant is its admin. Off by default, so a plain install keeps the single
    // shared team — the first account owns it as admin, later ones join as recruiter.
    let tenantId: string | undefined;
    let roles: User['roles'];
    if (this.selfServe && this.tenants) {
      const tenant: Tenant = {
        id: this.ids.next(),
        name: input.workspaceName?.trim() || defaultWorkspaceName(input.email),
        createdAt: this.clock.isoNow(),
        status: 'active',
      };
      await this.tenants.create(tenant);
      tenantId = tenant.id;
      roles = ['admin', 'recruiter'];
    } else {
      const first = (await this.users.list()).length === 0;
      roles = first ? ['admin', 'recruiter'] : ['recruiter'];
    }

    const user: User = {
      id: this.ids.next(),
      email: input.email,
      passwordHash: await this.hasher.hash(input.password),
      roles,
      createdAt: this.clock.isoNow(),
      ...(tenantId ? { tenantId } : {}),
    };
    await this.users.add(user);
    const token = await this.sessions.create(user.id);
    return { user: toUserView(user), token };
  }

  /**
   * Whether the user's workspace is suspended (ADR-0038). The default team has
   * no registry row, so it can never be suspended — and users without an
   * explicit tenant skip the lookup entirely (the common single-tenant case).
   */
  private async isTenantSuspended(tenantId?: string): Promise<boolean> {
    if (!tenantId || !this.tenants) return false;
    const tenant = await this.tenants.findById(tenantId);
    return tenant?.status === 'suspended';
  }

  /** Lazily computed once and cached; used to equalise unknown-email timing. */
  private dummyHash(): Promise<string> {
    return (this.dummyHashCache ??= this.hasher.hash('timing-equaliser'));
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    // Always run one password verification — against the real hash, or a dummy
    // when the email is unknown — so a non-existent account and a wrong password
    // take the same time. No account-existence timing oracle (security audit #4).
    const hash = user?.passwordHash ?? (await this.dummyHash());
    const ok = await this.hasher.verify(input.password, hash);
    if (!user || !ok) throw new UnauthorizedError('Invalid email or password');
    if (await this.isTenantSuspended(user.tenantId)) {
      throw new UnauthorizedError('This workspace has been suspended');
    }
    const token = await this.sessions.create(user.id);
    return { user: toUserView(user), token };
  }

  async logout(token: string | undefined): Promise<void> {
    if (token) await this.sessions.destroy(token);
  }

  async currentUser(token: string | undefined): Promise<UserView | null> {
    if (!token) return null;
    const userId = await this.sessions.userIdFor(token);
    if (!userId) return null;
    const user = await this.users.findById(userId);
    if (!user) return null;
    // A suspended workspace kills its members' sessions too, not just new logins.
    if (await this.isTenantSuspended(user.tenantId)) return null;
    return toUserView(user);
  }
}

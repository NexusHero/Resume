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
import type { AuthEngine } from '../ports/auth-engine.js';
import type { PasswordHasher } from '../ports/password-hasher.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import type { TenantRepository } from '../ports/tenant-repository.js';
import type { AppConfig } from '../config.js';

export interface AuthServiceDeps {
  userRepository: UserRepository;
  /** Credential + session authority (Better-Auth, ADR-0043). */
  authEngine: AuthEngine;
  /** Legacy scrypt verifier — only for migrating pre-Better-Auth accounts. */
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

/**
 * Email/password authentication. Credentials and sessions are owned by the
 * `AuthEngine` (Better-Auth); the domain `User` (roles, tenant, profile) stays
 * the source of truth here, linked by email (ADR-0043).
 */
export class AuthService {
  private readonly users: UserRepository;
  private readonly engine: AuthEngine;
  private readonly hasher: PasswordHasher;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly tenants?: TenantRepository;
  private readonly selfServe: boolean;

  constructor(deps: AuthServiceDeps) {
    this.users = deps.userRepository;
    this.engine = deps.authEngine;
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

    // The engine owns the credential + session; the domain user carries no
    // password hash of its own (ADR-0043).
    const { token } = await this.engine.signUp(input.email, input.password);
    const user: User = {
      id: this.ids.next(),
      email: input.email,
      passwordHash: '',
      roles,
      createdAt: this.clock.isoNow(),
      ...(tenantId ? { tenantId } : {}),
    };
    await this.users.add(user);
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

  async login(input: LoginInput): Promise<AuthResult> {
    let session = await this.engine.signIn(input.email, input.password);
    const user = await this.users.findByEmail(input.email);
    // Migration (ADR-0043): a pre-Better-Auth account still carries a legacy
    // scrypt hash and has no engine credential yet. Verify it once, mint the
    // engine credential, and drop the legacy hash — a transparent rehash on
    // login, so no user is forced to reset.
    if (
      !session &&
      user?.passwordHash &&
      (await this.hasher.verify(input.password, user.passwordHash))
    ) {
      session = await this.engine.signUp(input.email, input.password);
      await this.users.updatePassword(user.id, '');
    }
    if (!session || !user) throw new UnauthorizedError('Invalid email or password');
    if (await this.isTenantSuspended(user.tenantId)) {
      throw new UnauthorizedError('This workspace has been suspended');
    }
    return { user: toUserView(user), token: session.token };
  }

  async logout(token: string | undefined): Promise<void> {
    if (token) await this.engine.signOut(token);
  }

  async currentUser(token: string | undefined): Promise<UserView | null> {
    if (!token) return null;
    const resolved = await this.engine.resolve(token);
    if (!resolved) return null;
    const user = await this.users.findByEmail(resolved.email);
    if (!user) return null;
    // A suspended workspace kills its members' sessions too, not just new logins.
    if (await this.isTenantSuspended(user.tenantId)) return null;
    return toUserView(user);
  }
}

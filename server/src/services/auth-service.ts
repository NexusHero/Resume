import {
  type User,
  type UserView,
  type RegisterInput,
  type LoginInput,
  toUserView,
} from '../domain/user';
import { ConflictError, UnauthorizedError } from '../domain/errors';
import type { UserRepository } from '../ports/user-repository';
import type { SessionStore } from '../ports/session-store';
import type { PasswordHasher } from '../ports/password-hasher';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';

export interface AuthServiceDeps {
  userRepository: UserRepository;
  sessionStore: SessionStore;
  passwordHasher: PasswordHasher;
  clock: Clock;
  idGenerator: IdGenerator;
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

  constructor(deps: AuthServiceDeps) {
    this.users = deps.userRepository;
    this.sessions = deps.sessionStore;
    this.hasher = deps.passwordHasher;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictError('An account with this email already exists');
    const user: User = {
      id: this.ids.next(),
      email: input.email,
      passwordHash: await this.hasher.hash(input.password),
      createdAt: this.clock.isoNow(),
    };
    await this.users.add(user);
    const token = await this.sessions.create(user.id);
    return { user: toUserView(user), token };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    const ok = user ? await this.hasher.verify(input.password, user.passwordHash) : false;
    if (!user || !ok) throw new UnauthorizedError('Invalid email or password');
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
    return user ? toUserView(user) : null;
  }
}

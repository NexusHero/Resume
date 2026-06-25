import type { Application } from '../domain/application';

/** Persistence of application records (the source of truth list). */
export interface ApplicationRepository {
  list(): Promise<Application[]>;
  findById(id: string): Promise<Application | null>;
  add(application: Application): Promise<void>;
  update(application: Application): Promise<void>;
}

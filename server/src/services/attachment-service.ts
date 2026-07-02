import { type Attachment, type UploadAttachmentInput } from '../domain/attachment';
import { NotFoundError, ValidationError } from '../domain/errors';
import type { AttachmentStore, AttachmentBlob } from '../ports/attachment-store';
import type { TalentRepository } from '../ports/talent-repository';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';

export interface AttachmentServiceDeps {
  attachmentStore: AttachmentStore;
  talentRepository: TalentRepository;
  clock: Clock;
  idGenerator: IdGenerator;
}

/** Team-scoped CRUD for talent attachments (scope = the caller's shared team); verifies the talent exists in that scope first. */
export class AttachmentService {
  private readonly store: AttachmentStore;
  private readonly talents: TalentRepository;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(deps: AttachmentServiceDeps) {
    this.store = deps.attachmentStore;
    this.talents = deps.talentRepository;
    this.clock = deps.clock;
    this.ids = deps.idGenerator;
  }

  private async requireTalent(ownerId: string, talentId: string): Promise<void> {
    if (!(await this.talents.findById(ownerId, talentId))) {
      throw new NotFoundError(`Talent ${talentId} not found`);
    }
  }

  async list(ownerId: string, talentId: string): Promise<Attachment[]> {
    await this.requireTalent(ownerId, talentId);
    return this.store.list(ownerId, talentId);
  }

  async upload(
    ownerId: string,
    talentId: string,
    input: UploadAttachmentInput,
  ): Promise<Attachment> {
    await this.requireTalent(ownerId, talentId);
    const bytes = Buffer.from(input.dataBase64, 'base64');
    if (bytes.length === 0) throw new ValidationError('file is empty or not valid base64');
    const attachment: Attachment = {
      id: this.ids.next(),
      ownerId,
      talentId,
      name: input.name,
      contentType: input.contentType,
      size: bytes.length,
      createdAt: this.clock.isoNow(),
    };
    await this.store.add(attachment, bytes);
    return attachment;
  }

  async download(ownerId: string, id: string): Promise<AttachmentBlob> {
    const blob = await this.store.get(ownerId, id);
    if (!blob) throw new NotFoundError(`Attachment ${id} not found`);
    return blob;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    if (!(await this.store.remove(ownerId, id))) {
      throw new NotFoundError(`Attachment ${id} not found`);
    }
  }
}

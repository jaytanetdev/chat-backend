import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuickReply } from '../../entities';

@Injectable()
export class QuickReplyService {
  constructor(
    @InjectRepository(QuickReply)
    private readonly repo: Repository<QuickReply>,
  ) {}

  async findAllByUser(userId: string): Promise<QuickReply[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { sort_order: 'ASC', create_at: 'ASC' },
    });
  }

  async create(userId: string, label: string, text: string): Promise<QuickReply> {
    const maxOrder = await this.repo
      .createQueryBuilder('qr')
      .select('MAX(qr.sort_order)', 'max')
      .where('qr.user_id = :userId', { userId })
      .getRawOne();
    const sortOrder = (maxOrder?.max ?? -1) + 1;

    const entity = this.repo.create({ user_id: userId, label, text, sort_order: sortOrder });
    return this.repo.save(entity);
  }

  async update(userId: string, id: string, data: { label?: string; text?: string; sort_order?: number }): Promise<QuickReply> {
    const entity = await this.repo.findOneOrFail({ where: { quick_reply_id: id, user_id: userId } });
    if (data.label !== undefined) entity.label = data.label;
    if (data.text !== undefined) entity.text = data.text;
    if (data.sort_order !== undefined) entity.sort_order = data.sort_order;
    return this.repo.save(entity);
  }

  async remove(userId: string, id: string): Promise<void> {
    const entity = await this.repo.findOneOrFail({ where: { quick_reply_id: id, user_id: userId } });
    await this.repo.remove(entity);
  }

  async reorder(userId: string, ids: string[]): Promise<QuickReply[]> {
    const items = await this.findAllByUser(userId);
    const map = new Map(items.map((i) => [i.quick_reply_id, i]));
    const updates: QuickReply[] = [];
    for (let i = 0; i < ids.length; i++) {
      const item = map.get(ids[i]);
      if (item && item.sort_order !== i) {
        item.sort_order = i;
        updates.push(item);
      }
    }
    if (updates.length > 0) await this.repo.save(updates);
    return this.findAllByUser(userId);
  }
}

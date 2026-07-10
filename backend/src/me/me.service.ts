import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { MeData, UpdateMeData } from '@cocktailapp/shared';
import { Model, Types } from 'mongoose';
import { UserData, UserDataDocument } from './schemas/user-data.schema';

@Injectable()
export class MeService {
  constructor(
    @InjectModel(UserData.name)
    private readonly userDataModel: Model<UserDataDocument>,
  ) {}

  /** Current synced state. Returns empty sets (no doc created) until the client first PUTs. */
  async getData(userId: string): Promise<MeData> {
    if (!Types.ObjectId.isValid(userId)) return this.toMeData(null);
    const doc = await this.userDataModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    return this.toMeData(doc);
  }

  /** Replace the user's cabinet + favorites (server-authoritative). Upserts on first write. */
  async putData(userId: string, dto: UpdateMeData): Promise<MeData> {
    if (!Types.ObjectId.isValid(userId)) return this.toMeData(null);
    const doc = await this.userDataModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
          $set: {
            cabinet: this.clean(dto.cabinet),
            favorites: this.clean(dto.favorites),
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
    return this.toMeData(doc);
  }

  /** Erase the user's synced data (part of account deletion). */
  async deleteForUser(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) return;
    await this.userDataModel
      .deleteOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  /** De-duplicate and drop empty ids so the stored sets stay clean. */
  private clean(ids: string[]): string[] {
    return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  }

  private toMeData(doc: UserDataDocument | null): MeData {
    return {
      cabinet: doc?.cabinet ?? [],
      favorites: doc?.favorites ?? [],
      updatedAt: (doc?.get('updatedAt') as Date | undefined)?.toISOString(),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

/** Case-insensitive collation so email lookups match the unique index. */
const CI = { locale: 'en', strength: 2 } as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /** Normalize an email to its stored form (trimmed + lowercased). */
  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  create(email: string, passwordHash: string) {
    return this.userModel.create({
      email: UsersService.normalizeEmail(email),
      passwordHash,
    });
  }

  findByEmail(email: string) {
    return this.userModel
      .findOne({ email: UsersService.normalizeEmail(email) })
      .collation(CI)
      .exec();
  }

  findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return this.userModel.findById(id).exec();
  }

  /** Remove the account document itself (per-user data is deleted by MeService). */
  async deleteById(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) return;
    await this.userModel.findByIdAndDelete(id).exec();
  }
}

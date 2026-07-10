import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDataDocument = HydratedDocument<UserData>;

/** Per-user synced state: the cabinet + favorites, keyed by user. One doc per user. */
@Schema({ timestamps: true })
export class UserData {
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  cabinet: string[];

  @Prop({ type: [String], default: [] })
  favorites: string[];
}

export const UserDataSchema = SchemaFactory.createForClass(UserData);

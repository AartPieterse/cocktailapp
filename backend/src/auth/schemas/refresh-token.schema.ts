import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

/**
 * One live refresh-token session. We store only the token's random `jti` (the signed JWT itself
 * is never persisted), so refresh = "does this jti still exist?". Rotation consumes the record;
 * logout / account deletion removes it — that is how revocation works. A TTL index reaps expired
 * rows automatically.
 */
@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  jti: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// TTL: Mongo removes the row once expiresAt has passed (background sweep).
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

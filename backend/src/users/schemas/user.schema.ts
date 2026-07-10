import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, any>) => {
      delete ret._id;
      delete ret.passwordHash; // never leak the hash, even by accident
      return ret;
    },
  },
})
export class User {
  /** Stored trimmed + lowercased; the CI unique index is belt-and-suspenders. */
  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Case-insensitive unique email so "A@b.com" and "a@b.com" cannot both register.
UserSchema.index(
  { email: 1 },
  { unique: true, name: 'email_ci_unique', collation: { locale: 'en', strength: 2 } },
);

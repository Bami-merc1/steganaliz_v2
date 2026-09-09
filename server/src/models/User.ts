import mongoose, { type Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  // Per-user salt for client-side workspace key derivation.
  // Server stores this so the client can retrieve it on login
  // and derive the same workspace encryption key each session.
  workspaceSalt: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  },
  passwordHash: { type: String, required: true },
  workspaceSalt: { type: String, required: true }, // 32-byte hex, generated on register
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', UserSchema);
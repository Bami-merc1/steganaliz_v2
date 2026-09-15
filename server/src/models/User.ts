import mongoose, { type Document, Schema } from 'mongoose';

export interface IUser extends Document {
  supabaseId:    string;
  email:         string;
  passwordHash:  string;
  workspaceSalt: string;
  createdAt:     Date;
}

const UserSchema = new Schema<IUser>({
  supabaseId:    { type: String, required: true, unique: true, index: true },
  email:         { type: String, required: true, lowercase: true, trim: true },
  passwordHash:  { type: String, required: true },
  workspaceSalt: { type: String, required: true },
  createdAt:     { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', UserSchema);
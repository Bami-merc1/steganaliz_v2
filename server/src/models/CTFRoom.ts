import mongoose, { type Document, Schema } from 'mongoose';

export interface IParticipant {
  userId: mongoose.Types.ObjectId;
  email: string;
  joinedAt: Date;
  solved: boolean;
  solvedAt?: Date;
  attempts: number;
}

export interface ICTFRoom extends Document {
  code: string;                    // e.g. "STGZ-4821" — shared with participants
  hostId: mongoose.Types.ObjectId;
  hostEmail: string;
  title: string;
  hint: string;                    // plaintext hint shown to participants
  // Challenge file stored as base64 (max 5MB enforced in route)
  challengeFileB64: string;
  challengeFileName: string;
  challengeFileMime: string;
  // bcrypt hash of the correct extracted payload — never stored plaintext
  solutionHash: string;
  participants: IParticipant[];
  status: 'open' | 'closed';
  createdAt: Date;
  expiresAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>({
  userId:   { type: Schema.Types.ObjectId, required: true },
  email:    { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
  solved:   { type: Boolean, default: false },
  solvedAt: { type: Date },
  attempts: { type: Number, default: 0 },
}, { _id: false });

const CTFRoomSchema = new Schema<ICTFRoom>({
  code:              { type: String, required: true, unique: true, index: true },
  hostId:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hostEmail:         { type: String, required: true },
  title:             { type: String, required: true, maxlength: 120 },
  hint:              { type: String, default: '', maxlength: 500 },
  challengeFileB64:  { type: String, required: true },
  challengeFileName: { type: String, required: true },
  challengeFileMime: { type: String, required: true },
  solutionHash:      { type: String, required: true },
  participants:      { type: [ParticipantSchema], default: [] },
  status:            { type: String, enum: ['open', 'closed'], default: 'open' },
  createdAt:         { type: Date, default: Date.now },
  // Auto-delete rooms after 48 hours
  expiresAt:         { type: Date, default: () => new Date(Date.now() + 48 * 60 * 60 * 1000) },
});

CTFRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CTFRoom = mongoose.model<ICTFRoom>('CTFRoom', CTFRoomSchema);
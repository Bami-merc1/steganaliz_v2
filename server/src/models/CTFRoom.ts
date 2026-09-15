import mongoose, { type Document, Schema } from 'mongoose';

export interface IParticipant {
  userId:   string;   // Supabase UUID
  email:    string;
  joinedAt: Date;
  solved:   boolean;
  solvedAt?: Date;
  attempts: number;
}

export interface ICTFRoom extends Document {
  code:              string;
  hostId:            string;   // Supabase UUID
  hostEmail:         string;
  title:             string;
  hint:              string;
  challengeFileB64:  string;
  challengeFileName: string;
  challengeFileMime: string;
  solutionHash:      string;
  participants:      IParticipant[];
  status:            'open' | 'closed';
  createdAt:         Date;
  expiresAt:         Date;
}

const ParticipantSchema = new Schema<IParticipant>({
  userId:   { type: String, required: true },
  email:    { type: String, required: true },
  joinedAt: { type: Date,   default: Date.now },
  solved:   { type: Boolean, default: false },
  solvedAt: { type: Date },
  attempts: { type: Number, default: 0 },
}, { _id: false });

const CTFRoomSchema = new Schema<ICTFRoom>({
  code:              { type: String, required: true, unique: true, index: true },
  hostId:            { type: String, required: true },   // Supabase UUID
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
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 48 * 60 * 60 * 1000),
  },
});

CTFRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CTFRoom = mongoose.model<ICTFRoom>('CTFRoom', CTFRoomSchema);
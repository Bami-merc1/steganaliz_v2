import mongoose, { type Document, Schema } from 'mongoose';

export interface IWorkspaceEntry extends Document {
  userId:       string;   // Supabase UUID — string, not ObjectId
  encryptedBlob: string;
  iv:           string;
  salt:         string;
  entryType:    'embed' | 'detect' | 'batch-embed' | 'batch-detect' | 'metadata-strip';
  createdAt:    Date;
}

const WorkspaceEntrySchema = new Schema<IWorkspaceEntry>({
  userId:        { type: String, required: true, index: true },
  encryptedBlob: { type: String, required: true },
  iv:            { type: String, required: true },
  salt:          { type: String, required: true },
  entryType: {
    type: String,
    enum: ['embed', 'detect', 'batch-embed', 'batch-detect', 'metadata-strip'],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

WorkspaceEntrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const WorkspaceEntry = mongoose.model<IWorkspaceEntry>('WorkspaceEntry', WorkspaceEntrySchema);
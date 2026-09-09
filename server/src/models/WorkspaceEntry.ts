import mongoose, { type Document, Schema } from 'mongoose';

// The server stores ONLY encrypted blobs. It has no ability to read
// the content — decryption happens exclusively in the user's browser.
export interface IWorkspaceEntry extends Document {
  userId: mongoose.Types.ObjectId;
  // AES-256-GCM encrypted JSON blob (base64)
  encryptedBlob: string;
  // IV used for this encryption (base64, 12 bytes)
  iv: string;
  // PBKDF2 salt used for workspace key derivation (base64, 32 bytes)
  salt: string;
  // Unencrypted entry type for UI filtering — not sensitive
  entryType: 'embed' | 'detect' | 'batch-embed' | 'batch-detect' | 'metadata-strip';
  // Unencrypted timestamp
  createdAt: Date;
}

const WorkspaceEntrySchema = new Schema<IWorkspaceEntry>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  encryptedBlob: { type: String, required: true },
  iv: { type: String, required: true },
  salt: { type: String, required: true },
  entryType: {
    type: String,
    enum: ['embed', 'detect', 'batch-embed', 'batch-detect', 'metadata-strip'],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete entries older than 90 days
WorkspaceEntrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const WorkspaceEntry = mongoose.model<IWorkspaceEntry>('WorkspaceEntry', WorkspaceEntrySchema);
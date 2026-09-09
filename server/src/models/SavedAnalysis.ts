import mongoose, { type Document, Schema } from 'mongoose';

// Stores encrypted analysis results so users can compare across sessions.
// Like WorkspaceEntry — server holds only ciphertext.
export interface ISavedAnalysis extends Document {
  userId:        mongoose.Types.ObjectId;
  label:         string;        // user-assigned name, plaintext (not sensitive)
  encryptedBlob: string;        // AES-GCM encrypted JSON of the full verdict
  iv:            string;
  salt:          string;
  fileHash:      string;        // SHA-256 of the analysed file (for dedup)
  createdAt:     Date;
}

const SavedAnalysisSchema = new Schema<ISavedAnalysis>({
  userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  label:         { type: String, required: true, maxlength: 200 },
  encryptedBlob: { type: String, required: true },
  iv:            { type: String, required: true },
  salt:          { type: String, required: true },
  fileHash:      { type: String, required: true },
  createdAt:     { type: Date, default: Date.now },
});

SavedAnalysisSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const SavedAnalysis = mongoose.model<ISavedAnalysis>('SavedAnalysis', SavedAnalysisSchema);
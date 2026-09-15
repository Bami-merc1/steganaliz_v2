import mongoose, { type Document, Schema } from 'mongoose';

export interface ISavedAnalysis extends Document {
  userId:        string;   // Supabase UUID
  label:         string;
  encryptedBlob: string;
  iv:            string;
  salt:          string;
  fileHash:      string;
  createdAt:     Date;
}

const SavedAnalysisSchema = new Schema<ISavedAnalysis>({
  userId:        { type: String, required: true, index: true },
  label:         { type: String, required: true, maxlength: 200 },
  encryptedBlob: { type: String, required: true },
  iv:            { type: String, required: true },
  salt:          { type: String, required: true },
  fileHash:      { type: String, required: true },
  createdAt:     { type: Date, default: Date.now },
});

SavedAnalysisSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const SavedAnalysis = mongoose.model<ISavedAnalysis>('SavedAnalysis', SavedAnalysisSchema);
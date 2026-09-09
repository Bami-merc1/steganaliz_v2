import { Router, type Response } from 'express';
import { z } from 'zod';
import { WorkspaceEntry } from '../models/WorkspaceEntry.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const EntrySchema = z.object({
  encryptedBlob: z.string().max(5_000_000),
  iv:            z.string().min(12).max(24),   // 12 bytes = 16 base64 chars, allow padding variance
  salt:          z.string().min(40).max(48),   // 32 bytes = 44 base64 chars, allow variance
  entryType: z.enum(['embed', 'detect', 'batch-embed', 'batch-detect', 'metadata-strip']),
});

// GET /api/workspace/entries
router.get('/entries', async (req: AuthRequest, res: Response): Promise<void> => {
  const entries = await WorkspaceEntry
    .find({ userId: req.userId })
    .select('encryptedBlob iv salt entryType createdAt')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json(entries);
});

// POST /api/workspace/entries
router.post('/entries', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = EntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid entry data.', details: parsed.error.flatten() });
    return;
  }
  const entry = await WorkspaceEntry.create({ userId: req.userId, ...parsed.data });
  res.status(201).json({ id: entry._id, createdAt: entry.createdAt });
});

// DELETE /api/workspace/entries/:id
router.delete('/entries/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await WorkspaceEntry.deleteOne({ _id: req.params.id, userId: req.userId });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: 'Entry not found.' });
    return;
  }
  res.json({ message: 'Entry deleted.' });
});

// DELETE /api/workspace/entries  — clear all
router.delete('/entries', async (req: AuthRequest, res: Response): Promise<void> => {
  await WorkspaceEntry.deleteMany({ userId: req.userId });
  res.json({ message: 'All workspace entries cleared.' });
});

export default router;
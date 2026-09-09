import { Router, type Response } from 'express';
import { z } from 'zod';
import { SavedAnalysis } from '../models/SavedAnalysis.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const SaveSchema = z.object({
  label:         z.string().min(1).max(200),
  encryptedBlob: z.string().max(500_000),
  iv:            z.string().min(12).max(24),
  salt:          z.string().min(40).max(48),
  fileHash:      z.string().min(32).max(128),
});

router.post('/analyses', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = SaveSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid analysis data.' }); return; }
  const entry = await SavedAnalysis.create({ userId: req.userId, ...parsed.data });
  res.status(201).json({ id: entry._id, createdAt: entry.createdAt });
});

router.get('/analyses', async (req: AuthRequest, res: Response): Promise<void> => {
  const analyses = await SavedAnalysis
    .find({ userId: req.userId })
    .select('label encryptedBlob iv salt fileHash createdAt')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json(analyses);
});

router.delete('/analyses/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await SavedAnalysis.deleteOne({ _id: req.params.id, userId: req.userId });
  if (r.deletedCount === 0) { res.status(404).json({ error: 'Not found.' }); return; }
  res.json({ message: 'Deleted.' });
});

export default router;
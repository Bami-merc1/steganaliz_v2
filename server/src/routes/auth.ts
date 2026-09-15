import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { User } from '../models/User.js';
import { WorkspaceEntry } from '../models/WorkspaceEntry.js';
import { config } from '../config.js';

const router = Router();

// Validate a Supabase JWT and return the user's sub (UUID)
function verifySupabaseToken(token: string): string {
  try {
    const payload = jwt.verify(token, config.supabaseJwtSecret) as { sub: string; email?: string };
    return payload.sub;
  } catch {
    throw new Error('Invalid token');
  }
}

// POST /api/auth/sync — called after Supabase login/register
// Creates or retrieves the user's workspace salt
router.post('/sync', async (req: Request, res: Response): Promise<void> => {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'No token.' }); return; }

  let supabaseId: string;
  let email = '';
  try {
    const payload = jwt.decode(header.slice(7)) as { sub: string; email?: string } | null;
    if (!payload?.sub) throw new Error('Invalid token structure');
    verifySupabaseToken(header.slice(7)); // throws if invalid
    supabaseId = payload.sub;
    email = payload.email ?? '';
  } catch (e) {
    res.status(401).json({ error: 'Invalid Supabase token.' });
    return;
  }

  // Find or create workspace record
  let user = await User.findOne({ supabaseId });
  if (!user) {
    const workspaceSalt = Buffer.from(
      randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''), 'hex'
    ).toString('base64');
    user = await User.create({
      supabaseId,
      email,
      passwordHash: 'supabase-managed',
      workspaceSalt,
    });
  }

  res.json({ workspaceSalt: user.workspaceSalt, email: user.email });
});

// DELETE /api/auth/account
router.delete('/account', async (req: Request, res: Response): Promise<void> => {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'No token.' }); return; }
  try {
    const payload = jwt.decode(header.slice(7)) as { sub?: string } | null;
    if (!payload?.sub) throw new Error('Bad token');
    verifySupabaseToken(header.slice(7));
    const user = await User.findOneAndDelete({ supabaseId: payload.sub });
    if (user) await WorkspaceEntry.deleteMany({ userId: user._id });
    res.json({ message: 'Account deleted.' });
  } catch {
    res.status(401).json({ error: 'Invalid token.' });
  }
});

export default router;
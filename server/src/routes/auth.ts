import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';   // ← explicit Node crypto import
import { z } from 'zod';
import { User } from '../models/User.js';
import { WorkspaceEntry } from '../models/WorkspaceEntry.js';
import { config } from '../config.js';

const router = Router();

const AuthSchema = z.object({
  email:    z.string().email().max(254).toLowerCase().trim(),
  password: z.string().min(8).max(128),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = AuthSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email or password (min 8 characters).' });
    return;
  }
  const { email, password } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) {
    await bcrypt.hash('dummy-timing-equalizer', 12);
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const passwordHash   = await bcrypt.hash(password, 12);
  const workspaceSalt  = Buffer.from(
    randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''),
    'hex'
  ).toString('base64');

  const user  = await User.create({ email, passwordHash, workspaceSalt });
  const token = jwt.sign({ userId: user._id.toString() }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  res.status(201).json({ token, workspaceSalt, email: user.email });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = AuthSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid credentials.' });
    return;
  }
  const { email, password } = parsed.data;

  const DUMMY_HASH = '$2b$12$dummy.hash.to.prevent.timing.attack.on.email.enumeration';
  const user         = await User.findOne({ email });
  const validPassword = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, DUMMY_HASH);

  if (!user || !validPassword) {
    res.status(401).json({ error: 'Incorrect email or password.' });
    return;
  }

  const token = jwt.sign({ userId: user._id.toString() }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  res.json({ token, workspaceSalt: user.workspaceSalt, email: user.email });
});

// DELETE /api/auth/account
router.delete('/account', async (req: Request, res: Response): Promise<void> => {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { userId: string };
    await User.findByIdAndDelete(payload.userId);
    await WorkspaceEntry.deleteMany({ userId: payload.userId });
    res.json({ message: 'Account and all workspace data permanently deleted.' });
  } catch {
    res.status(401).json({ error: 'Invalid token.' });
  }
});

export default router;
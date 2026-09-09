import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { CTFRoom } from '../models/CTFRoom.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = Router();
router.use(requireAuth);

// Generate a short, readable room code
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'STGZ-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const CreateRoomSchema = z.object({
  title:             z.string().min(3).max(120),
  hint:              z.string().max(500).default(''),
  challengeFileB64:  z.string().max(7_000_000), // ~5MB base64
  challengeFileName: z.string().max(255),
  challengeFileMime: z.string().max(100),
  solution:          z.string().min(1).max(10_000), // plaintext answer — hashed before storage
});

// POST /api/ctf/rooms — create a room
router.post('/rooms', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = CreateRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid room data.', details: parsed.error.flatten() });
    return;
  }

  const user = await User.findById(req.userId).lean();
  if (!user) { res.status(401).json({ error: 'User not found.' }); return; }

  const { title, hint, challengeFileB64, challengeFileName, challengeFileMime, solution } = parsed.data;
  const solutionHash = await bcrypt.hash(solution.trim(), 10);

  // Retry code generation on collision (astronomically rare)
  let code = generateCode();
  let attempts = 0;
  while (await CTFRoom.exists({ code }) && attempts < 5) {
    code = generateCode();
    attempts++;
  }

  const room = await CTFRoom.create({
    code,
    hostId: req.userId,
    hostEmail: user.email,
    title,
    hint,
    challengeFileB64,
    challengeFileName,
    challengeFileMime,
    solutionHash,
  });

  res.status(201).json({
    code: room.code,
    title: room.title,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
  });
});

// GET /api/ctf/rooms/:code — get room info + challenge file
router.get('/rooms/:code', async (req: AuthRequest, res: Response): Promise<void> => {
  const room = await CTFRoom.findOne({ code: req.params.code.toUpperCase() }).lean();
  if (!room) { res.status(404).json({ error: 'Room not found or expired.' }); return; }
  if (room.status === 'closed') { res.status(410).json({ error: 'This room has been closed by the host.' }); return; }

  const user = await User.findById(req.userId).lean();
  if (!user) { res.status(401).json({ error: 'User not found.' }); return; }

  // Auto-add participant if not already in the room
  const isParticipant = room.participants.some(
    (p) => p.userId.toString() === req.userId
  );
  if (!isParticipant && room.hostId.toString() !== req.userId) {
    await CTFRoom.updateOne(
      { code: room.code },
      { $push: { participants: { userId: req.userId, email: user.email } } }
    );
    // Emit via socket (imported in index.ts)
    req.io
      ?.to(room.code)
      .emit('room:participant_joined', { email: user.email, joinedAt: new Date() });
  }

  // Return room data — omit solutionHash
  res.json({
    code: room.code,
    title: room.title,
    hint: room.hint,
    hostEmail: room.hostEmail,
    challengeFileB64: room.challengeFileB64,
    challengeFileName: room.challengeFileName,
    challengeFileMime: room.challengeFileMime,
    participants: room.participants.map((p) => ({
      email: p.email,
      solved: p.solved,
      solvedAt: p.solvedAt,
      attempts: p.attempts,
    })),
    status: room.status,
    expiresAt: room.expiresAt,
  });
});

// POST /api/ctf/rooms/:code/submit — submit an answer
router.post('/rooms/:code/submit', async (req: AuthRequest, res: Response): Promise<void> => {
  const { answer } = z.object({ answer: z.string().min(1).max(10_000) }).parse(req.body);
  const room = await CTFRoom.findOne({ code: req.params.code.toUpperCase() });

  if (!room) { res.status(404).json({ error: 'Room not found.' }); return; }
  if (room.status === 'closed') { res.status(410).json({ error: 'Room is closed.' }); return; }

  const participantIdx = room.participants.findIndex(
    (p) => p.userId.toString() === req.userId
  );
  if (participantIdx === -1 && room.hostId.toString() !== req.userId) {
    res.status(403).json({ error: 'You are not a participant in this room.' });
    return;
  }

  // Increment attempt count
  if (participantIdx !== -1) {
    room.participants[participantIdx].attempts += 1;
  }

  const correct = await bcrypt.compare(answer.trim(), room.solutionHash);

  if (correct && participantIdx !== -1 && !room.participants[participantIdx].solved) {
    room.participants[participantIdx].solved = true;
    room.participants[participantIdx].solvedAt = new Date();

    // Emit solve event to all room participants
    const user = await User.findById(req.userId).lean();
    req.io
      ?.to(room.code)
      .emit('room:solved', {
        email: user?.email ?? 'unknown',
        solvedAt: room.participants[participantIdx].solvedAt,
        attempts: room.participants[participantIdx].attempts,
      });
  }

  await room.save();

  res.json({
    correct,
    attempts: participantIdx !== -1 ? room.participants[participantIdx].attempts : 0,
    leaderboard: room.participants
      .filter((p) => p.solved)
      .sort((a, b) => (a.solvedAt?.getTime() ?? 0) - (b.solvedAt?.getTime() ?? 0))
      .map((p) => ({ email: p.email, solvedAt: p.solvedAt, attempts: p.attempts })),
  });
});

// GET /api/ctf/rooms — list rooms the user created or participates in
router.get('/rooms', async (req: AuthRequest, res: Response): Promise<void> => {
  const rooms = await CTFRoom.find({
    $or: [
      { hostId: req.userId },
      { 'participants.userId': req.userId },
    ],
  })
    .select('code title status hostEmail participants createdAt expiresAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json(rooms.map((r) => ({
    code: r.code,
    title: r.title,
    status: r.status,
    hostEmail: r.hostEmail,
    participantCount: r.participants.length,
    solvedCount: r.participants.filter((p) => p.solved).length,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
  })));
});

// PATCH /api/ctf/rooms/:code/close — host closes the room
router.patch('/rooms/:code/close', async (req: AuthRequest, res: Response): Promise<void> => {
  const room = await CTFRoom.findOne({ code: req.params.code.toUpperCase() });
  if (!room) { res.status(404).json({ error: 'Room not found.' }); return; }
  if (room.hostId.toString() !== req.userId) {
    res.status(403).json({ error: 'Only the host can close this room.' });
    return;
  }
  room.status = 'closed';
  await room.save();
  req.io
    ?.to(room.code)
    .emit('room:closed', { code: room.code });
  res.json({ message: 'Room closed.' });
});

export default router;
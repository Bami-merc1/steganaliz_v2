import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import authRouter from './routes/auth.js';
import workspaceRouter from './routes/workspace.js';
import ctfRouter from './routes/ctfRooms.js';
import cnnRouter from './routes/cnn.js';
import batchApiRouter from './routes/batchApi.js';
import comparisonRouter from './routes/comparison.js';

const app  = express();
const http = createServer(app);

// Socket.io — only from the Steganaliz frontend
const io = new SocketServer(http, {
  cors: { origin: config.frontendOrigin, methods: ['GET', 'POST'] },
});

app.use(helmet());
app.use(cors({ origin: config.frontendOrigin, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '8mb' }));

// Attach io to every request so routes can emit events
app.use((req, _res, next) => {
  (req as express.Request & { io: SocketServer }).io = io;
  next();
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const apiLimiter  = rateLimit({ windowMs: 60 * 1000, max: 120 });
const ctfLimiter  = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: 'Slow down — CTF rate limit reached.' } });

app.use('/api/auth',      authLimiter, authRouter);
app.use('/api/workspace', apiLimiter,  workspaceRouter);
app.use('/api/ctf',       ctfLimiter,  ctfRouter);
app.use('/api/cnn', apiLimiter, cnnRouter);
app.use('/api/batch', apiLimiter, batchApiRouter);
app.use('/api/comparison', apiLimiter, comparisonRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

// Socket.io auth middleware — verify JWT before allowing socket connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Authentication required.'));
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error('Invalid token.'));
  }
});

io.on('connection', (socket) => {
  // Client joins a CTF room channel
  socket.on('ctf:join_room', (code: string) => {
    socket.join(code.toUpperCase());
  });

  socket.on('ctf:leave_room', (code: string) => {
    socket.leave(code.toUpperCase());
  });

  socket.on('disconnect', () => { /* cleanup handled automatically */ });
});

mongoose.connect(config.mongoUri).then(() => {
  console.log('MongoDB connected');
  http.listen(config.port, () => {
    console.log(`Steganaliz API + WS running on port ${config.port}`);
  });
}).catch((err) => {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
});
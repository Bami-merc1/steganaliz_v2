import type { Server as SocketServer } from 'socket.io';

declare global {
  namespace Express {
    interface Request {
      io?: SocketServer;
    }
  }
}

export {};
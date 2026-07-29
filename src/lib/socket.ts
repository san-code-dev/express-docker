// src/lib/socket.ts
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export const setSocketInstance = (serverInstance: SocketIOServer) => {
  io = serverInstance;
};

export const getSocketInstance = (): SocketIOServer | null => {
  return io;
};
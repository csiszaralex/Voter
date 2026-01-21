import { io, Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const socket: Socket = io(import.meta.env.PROD ? undefined : URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

import { io, Socket } from 'socket.io-client';

// Hardcoded URL developmenthez, élesben env-ből jöhet
const URL = 'http://localhost:3001';

export const socket: Socket = io(URL, {
  autoConnect: false, // Csak név megadása után csatlakozunk
});

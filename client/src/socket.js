import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_BACKEND_URL || '/', {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export default socket;

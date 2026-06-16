import { io } from 'socket.io-client';

// In development: connect to '/' (proxied by Vite to localhost:5000)
// In production:  connect to the Render backend via VITE_BACKEND_URL
const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

const socket = io(BACKEND, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export default socket;

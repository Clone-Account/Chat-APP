import { io } from 'socket.io-client';

// In development: connect to '/' (proxied by Vite to localhost:5000)
// In production:  connect to the Render backend via VITE_BACKEND_URL
const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

const socket = io(BACKEND, {
  autoConnect: false,
  // Polling first — Render free tier is more stable with polling before WS upgrade
  transports: ['polling', 'websocket'],
  withCredentials: true,
});

export default socket;

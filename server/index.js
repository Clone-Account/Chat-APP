require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path    = require('path');
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const { ExpressPeerServer } = require('peer');

const authRoutes    = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const socketHandlers = require('./socket/handlers');

const app    = express();
const server = http.createServer(app);

const isProd = process.env.NODE_ENV === 'production';

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: isProd ? '*' : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: !isProd,
  },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: isProd ? '*' : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: !isProd,
}));
app.use(express.json());

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/messages', messageRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: '💕 Romantic Chat Server is running!' });
});

// ─── Socket Handlers ──────────────────────────────────────────────────────────
socketHandlers(io);

// ─── PeerJS — runs on SAME port as Express (works on Render free tier) ────────
const peerServer = ExpressPeerServer(server, { debug: false });
app.use('/peerjs', peerServer);

peerServer.on('connection',    (c) => console.log(`📹 Peer connected: ${c.getId()}`));
peerServer.on('disconnect',    (c) => console.log(`📹 Peer left:      ${c.getId()}`));

// ─── Serve React build in production ─────────────────────────────────────────
// (Removed SPA fallback because the frontend is hosted separately on Vercel)

// ─── MongoDB + Start ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => {
      console.log(`💕 Server running on http://localhost:${PORT}`);
      console.log(`📹 PeerJS available at http://localhost:${PORT}/peerjs`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });

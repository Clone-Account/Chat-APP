const Message = require('../models/Message');
const User = require('../models/User');

// Track connected users: { userId -> socketId }
const connectedUsers = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 New socket connected:', socket.id);

    // User joins and registers their socket
    socket.on('user_connected', async ({ userId }) => {
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;

      // Mark user as online in DB
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

      // Notify partner that user is online
      socket.broadcast.emit('partner_online', { userId, isOnline: true });
      console.log(`✅ User ${userId} is online`);
    });

    // Receive and broadcast a new chat message
    socket.on('send_message', async ({ senderId, content, translatedContent, originalLang }) => {
      try {
        const message = await Message.create({
          sender: senderId,
          content,
          translatedContent,
          originalLang,
        });

        const populated = await message.populate('sender', 'username displayName language');

        // Broadcast to everyone (including sender for confirmation)
        io.emit('new_message', {
          _id: populated._id,
          sender: populated.sender,
          content: populated.content,
          translatedContent: populated.translatedContent,
          originalLang: populated.originalLang,
          createdAt: populated.createdAt,
        });
      } catch (err) {
        console.error('Error saving message:', err);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('typing_start', ({ userId, displayName }) => {
      socket.broadcast.emit('partner_typing', { userId, displayName, isTyping: true });
    });

    socket.on('typing_stop', ({ userId }) => {
      socket.broadcast.emit('partner_typing', { userId, isTyping: false });
    });

    // ─── WebRTC / PeerJS call signaling ───────────────────────────────────

    // Notify partner that we want to call them
    socket.on('call_user', ({ callerId, callerName, callerPeerId, callType }) => {
      socket.broadcast.emit('incoming_call', {
        callerId,
        callerName,
        callerPeerId,
        callType, // 'video' | 'audio'
      });
    });

    // Partner accepted the call
    socket.on('call_accepted', ({ calleePeerId }) => {
      socket.broadcast.emit('call_accepted', { calleePeerId });
    });

    // Partner rejected/ended the call
    socket.on('call_ended', () => {
      socket.broadcast.emit('call_ended');
    });

    // ─── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const userId = socket.userId;
      if (userId) {
        connectedUsers.delete(userId);
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        socket.broadcast.emit('partner_online', { userId, isOnline: false });
        console.log(`❌ User ${userId} went offline`);
      }
    });
  });
};

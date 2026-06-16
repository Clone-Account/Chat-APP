import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import socket from '../socket';
import { translateText } from '../utils/translate';
import MessageBubble from '../components/MessageBubble';
import VideoCall from '../components/VideoCall';
import FloatingHearts from '../components/FloatingHearts';

export default function Chat({ user, token, onLogout }) {
  const [messages, setMessages]           = useState([]);
  const [inputText, setInputText]         = useState('');
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerName, setPartnerName]     = useState('💕');
  const [isTranslating, setIsTranslating] = useState(false);
  const [toast, setToast]                 = useState('');

  // Call state
  const [activeCall, setActiveCall]       = useState(null); // { type, isInitiator, incomingData }
  const [incomingCall, setIncomingCall]   = useState(null); // { callerPeerId, callerName, callType }

  const messagesEndRef   = useRef(null);
  const typingTimeoutRef = useRef(null);
  const textareaRef      = useRef(null);

  // ─── Helpers ────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ─── Load history ────────────────────────────────────────────
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data } = await axios.get('/api/messages', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(data);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    fetchMessages();
  }, [token]);

  // ─── Socket setup ────────────────────────────────────────────
  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.emit('user_connected', { userId: user.id });

    socket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('partner_online', ({ isOnline, userId }) => {
      if (userId !== user.id) {
        setPartnerOnline(isOnline);
        if (isOnline) showToast('💕 Partner is online!');
      }
    });

    socket.on('partner_typing', ({ isTyping, displayName }) => {
      setPartnerTyping(isTyping);
      if (displayName) setPartnerName(displayName);
    });

    socket.on('incoming_call', (callData) => {
      setIncomingCall(callData);
      setPartnerName(callData.callerName);
    });

    return () => {
      socket.off('new_message');
      socket.off('partner_online');
      socket.off('partner_typing');
      socket.off('incoming_call');
      socket.disconnect();
    };
  }, [user.id]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, partnerTyping]);

  // ─── Send Message ─────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    setIsTranslating(true);

    // Determine translation direction
    const myLang      = user.language; // 'en' or 'id'
    const targetLang  = myLang === 'en' ? 'id' : 'en';

    let translated = '';
    try {
      translated = await translateText(text, myLang, targetLang);
    } catch {
      translated = text;
    }
    setIsTranslating(false);

    socket.emit('send_message', {
      senderId:          user.id,
      content:           text,
      translatedContent: translated,
      originalLang:      myLang,
    });

    // Stop typing
    socket.emit('typing_stop', { userId: user.id });
  }, [inputText, user]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Typing Indicator ─────────────────────────────────────────
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    socket.emit('typing_start', { userId: user.id, displayName: user.displayName });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { userId: user.id });
    }, 1500);

    // Auto-resize textarea
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
  };

  // ─── Calls ───────────────────────────────────────────────────
  const startCall = (type) => {
    setActiveCall({ type, isInitiator: true, incomingData: null });
  };

  const acceptCall = () => {
    setActiveCall({
      type:         incomingCall.callType,
      isInitiator:  false,
      incomingData: { callerPeerId: incomingCall.callerPeerId },
    });
    setIncomingCall(null);
  };

  const declineCall = () => {
    socket.emit('call_ended');
    setIncomingCall(null);
    showToast('📵 Call declined');
  };

  const endCall = () => {
    setActiveCall(null);
  };

  // ─── Logout ──────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="page-wrapper" style={{ background: 'none', height: '100vh', display: 'block' }}>
      <FloatingHearts />

      <div className="chat-layout">
        {/* ── Header ── */}
        <header className="chat-header">
          {/* Left: partner info */}
          <div className="header-partner">
            <div className="partner-avatar">
              💕
              <span className={`online-dot ${partnerOnline ? 'online' : 'offline'}`} />
            </div>
            <div>
              <div className="partner-name">{partnerName}</div>
              <div className={`partner-status ${partnerTyping ? 'typing-status' : ''}`}>
                {partnerTyping
                  ? '💕 typing...'
                  : partnerOnline
                  ? '🟢 Online'
                  : '⚫ Offline'}
              </div>
            </div>
          </div>

          {/* Center: app title */}
          <div className="header-title">Our Little World 💕</div>

          {/* Right: actions */}
          <div className="header-actions">
            <button
              id="btn-voice-call"
              className="icon-btn"
              onClick={() => startCall('audio')}
              title="Voice Call"
            >
              🎤
            </button>
            <button
              id="btn-video-call"
              className="icon-btn"
              onClick={() => startCall('video')}
              title="Video Call"
            >
              📹
            </button>
            <button
              id="btn-logout"
              className="icon-btn danger"
              onClick={handleLogout}
              title="Logout"
            >
              👋
            </button>
          </div>
        </header>

        {/* ── Messages ── */}
        <main className="messages-area">
          {messages.length === 0 ? (
            <div className="messages-empty">
              <div className="empty-icon">💌</div>
              <div className="empty-title">Start your story</div>
              <div className="empty-sub">
                Send a message — it'll be translated automatically 🌍
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg._id}
                message={msg}
                currentUserId={user.id}
              />
            ))
          )}

          {partnerTyping && (
            <div className="msg-wrapper received" style={{ opacity: 0.7 }}>
              <div className="msg-avatar">💕</div>
              <div className="msg-bubble-wrap">
                <div className="msg-bubble" style={{ padding: '0.65rem 1rem' }}>
                  <span className="typing-dots">
                    <span>●</span><span>●</span><span>●</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* ── Translating hint ── */}
        {isTranslating && (
          <div className="translating-indicator">
            <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
            Translating...
          </div>
        )}

        {/* ── Input bar ── */}
        <footer className="chat-input-bar">
          <div className="input-wrapper">
            <textarea
              id="chat-input"
              ref={textareaRef}
              className="chat-textarea"
              placeholder={
                user.language === 'en'
                  ? "Type in English… she'll see it in Indonesian 💕"
                  : "Ketik dalam Bahasa Indonesia… dia akan membaca dalam bahasa Inggris 💕"
              }
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
            />
          </div>
          <button
            id="btn-send"
            className="send-btn"
            onClick={sendMessage}
            disabled={!inputText.trim() || isTranslating}
            title="Send"
          >
            💌
          </button>
        </footer>
      </div>

      {/* ── Incoming Call Banner ── */}
      {incomingCall && !activeCall && (
        <div className="incoming-call-banner">
          <div className="incoming-call-icon">
            {incomingCall.callType === 'video' ? '📹' : '🎤'}
          </div>
          <div className="incoming-call-info">
            <div className="incoming-call-name">{incomingCall.callerName}</div>
            <div className="incoming-call-type">
              Incoming {incomingCall.callType === 'video' ? 'video' : 'voice'} call…
            </div>
          </div>
          <div className="incoming-call-actions">
            <button id="btn-accept-call" className="incoming-btn accept" onClick={acceptCall} title="Accept">✅</button>
            <button id="btn-decline-call" className="incoming-btn decline" onClick={declineCall} title="Decline">❌</button>
          </div>
        </div>
      )}

      {/* ── Active Call ── */}
      {activeCall && (
        <VideoCall
          socket={socket}
          currentUser={user}
          partnerName={partnerName}
          callType={activeCall.type}
          isInitiator={activeCall.isInitiator}
          incomingCall={activeCall.incomingData}
          onEnd={endCall}
        />
      )}

      {/* ── Toast ── */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

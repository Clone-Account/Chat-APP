import { useState } from 'react';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, currentUserId }) {
  const [showOriginal, setShowOriginal] = useState(false);

  const isSent = message.sender._id === currentUserId || message.sender === currentUserId;
  const senderInitial = (message.sender.displayName || 'U')[0].toUpperCase();

  const hasTranslation =
    message.translatedContent && message.translatedContent !== message.content;

  // What to show as main text:
  // - If sent by me → show my original (English)
  // - If received   → show translated version (my language)
  const mainText = isSent
    ? message.content
    : showOriginal
    ? message.content
    : message.translatedContent || message.content;

  const translatedLabel = isSent
    ? null
    : showOriginal
    ? null
    : hasTranslation
    ? null
    : null;

  return (
    <div className={`msg-wrapper ${isSent ? 'sent' : 'received'}`}>
      {!isSent && (
        <div className="msg-avatar" title={message.sender.displayName}>
          {senderInitial}
        </div>
      )}

      <div className="msg-bubble-wrap">
        <div className="msg-bubble">
          {mainText}

          {/* For sent messages: show translated (what partner sees) */}
          {isSent && hasTranslation && (
            <div className="msg-translation">
              🇮🇩 {message.translatedContent}
            </div>
          )}
        </div>

        <div className="msg-time">
          {formatTime(message.createdAt)}
          {!isSent && hasTranslation && (
            <button
              className="msg-original-toggle"
              onClick={() => setShowOriginal((p) => !p)}
              style={{ marginLeft: '6px' }}
            >
              {showOriginal ? '🌐 see translation' : '🔤 see original'}
            </button>
          )}
        </div>
      </div>

      {isSent && (
        <div className="msg-avatar" style={{ background: 'linear-gradient(135deg, #6b21a8, #a21caf)' }}>
          {senderInitial}
        </div>
      )}
    </div>
  );
}

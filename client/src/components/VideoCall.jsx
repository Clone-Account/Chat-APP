import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';

export default function VideoCall({
  socket,
  currentUser,
  partnerName,
  callType,           // 'video' | 'audio'
  incomingCall,       // { callerPeerId, callerName } | null
  isInitiator,        // true = I called, false = I received
  onEnd,
}) {
  const [status, setStatus] = useState(isInitiator ? 'calling' : 'incoming');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [duration, setDuration] = useState(0);

  const peerRef       = useRef(null);
  const localStream   = useRef(null);
  const remoteVideoEl = useRef(null);
  const localVideoEl  = useRef(null);
  const timerRef      = useRef(null);

  // In dev: use Vite proxy (window.location = localhost:5173 → proxied to 5000).
  // In production: parse the Render backend URL from the env variable.
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  let peerHost, peerPort, isSecure;
  if (backendUrl) {
    try {
      const parsed = new URL(backendUrl);
      peerHost = parsed.hostname;
      isSecure = parsed.protocol === 'https:';
      peerPort = parseInt(parsed.port) || (isSecure ? 443 : 80);
    } catch {
      peerHost  = window.location.hostname;
      isSecure  = window.location.protocol === 'https:';
      peerPort  = parseInt(window.location.port) || (isSecure ? 443 : 80);
    }
  } else {
    peerHost  = window.location.hostname;
    isSecure  = window.location.protocol === 'https:';
    peerPort  = parseInt(window.location.port) || (isSecure ? 443 : 80);
  }

  // Format seconds → MM:SS
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startTimer = () => {
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const getMedia = async () => {
    const constraints = {
      audio: true,
      video: callType === 'video' ? { width: 1280, height: 720 } : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStream.current = stream;
    if (localVideoEl.current && callType === 'video') {
      localVideoEl.current.srcObject = stream;
    }
    return stream;
  };

  const attachRemoteStream = (stream) => {
    if (remoteVideoEl.current) {
      remoteVideoEl.current.srcObject = stream;
    }
  };

  const handleEnd = () => {
    stopTimer();
    localStream.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.destroy();
    socket.emit('call_ended');
    onEnd();
  };

  useEffect(() => {
    let peer;

    const init = async () => {
      try {
        const stream = await getMedia();

        peer = new Peer(undefined, {
          host:   peerHost,
          port:   peerPort,
          path:   '/peerjs',
          secure: isSecure,
        });
        peerRef.current = peer;

        peer.on('open', (myPeerId) => {
          if (isInitiator) {
            // Tell partner we're calling
            socket.emit('call_user', {
              callerId: currentUser.id,
              callerName: currentUser.displayName,
              callerPeerId: myPeerId,
              callType,
            });
            setStatus('calling');
          } else {
            // Answer the call
            const call = peer.call(incomingCall.callerPeerId, stream);
            call.on('stream', (remoteStream) => {
              attachRemoteStream(remoteStream);
              setStatus('connected');
              startTimer();
            });
            socket.emit('call_accepted', { calleePeerId: myPeerId });
          }
        });

        // Receive incoming call answer (if initiator)
        if (isInitiator) {
          socket.on('call_accepted', ({ calleePeerId }) => {
            const call = peer.call(calleePeerId, stream);
            call.on('stream', (remoteStream) => {
              attachRemoteStream(remoteStream);
              setStatus('connected');
              startTimer();
            });
          });
        }

        // Partner ended call
        socket.on('call_ended', () => {
          stopTimer();
          localStream.current?.getTracks().forEach((t) => t.stop());
          peer.destroy();
          onEnd();
        });

      } catch (err) {
        console.error('Media error:', err);
        setStatus('error');
      }
    };

    init();

    return () => {
      stopTimer();
      socket.off('call_accepted');
      socket.off('call_ended');
      localStream.current?.getTracks().forEach((t) => t.stop());
      peer?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    const audio = localStream.current?.getAudioTracks()[0];
    if (audio) {
      audio.enabled = !audio.enabled;
      setIsMuted(!audio.enabled);
    }
  };

  const toggleCam = () => {
    const video = localStream.current?.getVideoTracks()[0];
    if (video) {
      video.enabled = !video.enabled;
      setIsCamOff(!video.enabled);
    }
  };

  return (
    <div className="call-overlay">
      <div className="call-container">

        {/* ── Audio call: show avatar ── */}
        {callType === 'audio' && (
          <div className="audio-call-container">
            <div className="audio-avatar">💕</div>
            <div className="audio-call-name">{partnerName}</div>
            {status === 'calling' && <div className="audio-call-duration">Calling…</div>}
            {status === 'connected' && (
              <div className="audio-call-duration">{fmt(duration)}</div>
            )}
          </div>
        )}

        {/* ── Video call: show video feeds ── */}
        {callType === 'video' && (
          <>
            {status === 'calling' && (
              <div className="call-waiting">
                <div className="call-waiting-icon">📹</div>
                <div className="call-waiting-text">Calling {partnerName}…</div>
              </div>
            )}
            {status === 'connected' && (
              <>
                <video
                  ref={remoteVideoEl}
                  className="call-remote-video"
                  autoPlay
                  playsInline
                />
                <video
                  ref={localVideoEl}
                  className="call-local-video"
                  autoPlay
                  playsInline
                  muted
                />
              </>
            )}
          </>
        )}

        {status === 'error' && (
          <div className="call-waiting">
            <div className="call-waiting-icon">❌</div>
            <div className="call-waiting-text">Camera/mic access denied</div>
          </div>
        )}

        {/* ── Controls ── */}
        <div className="call-controls">
          <button className="call-btn mute" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? '🔇' : '🎤'}
          </button>

          {callType === 'video' && (
            <button className="call-btn cam" onClick={toggleCam} title={isCamOff ? 'Turn on cam' : 'Turn off cam'}>
              {isCamOff ? '📷' : '📹'}
            </button>
          )}

          <button className="call-btn end" onClick={handleEnd} title="End call">
            📵
          </button>
        </div>
      </div>
    </div>
  );
}

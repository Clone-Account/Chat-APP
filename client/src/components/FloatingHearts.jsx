import { useEffect, useRef } from 'react';

const HEARTS = ['💕', '💗', '💖', '💝', '🌸', '✨', '💞', '🌺'];

export default function FloatingHearts() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const spawnHeart = () => {
      const heart = document.createElement('span');
      heart.className = 'heart';
      heart.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];

      const size = 0.8 + Math.random() * 0.8;
      const left = Math.random() * 100;
      const duration = 6 + Math.random() * 6;
      const delay = Math.random() * 2;

      heart.style.cssText = `
        left: ${left}%;
        font-size: ${size}rem;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
      `;

      container.appendChild(heart);
      setTimeout(() => heart.remove(), (duration + delay) * 1000);
    };

    // Spawn hearts at intervals
    const interval = setInterval(spawnHeart, 1200);
    // Initial batch
    for (let i = 0; i < 5; i++) setTimeout(spawnHeart, i * 300);

    return () => clearInterval(interval);
  }, []);

  return <div className="hearts-container" ref={containerRef} />;
}

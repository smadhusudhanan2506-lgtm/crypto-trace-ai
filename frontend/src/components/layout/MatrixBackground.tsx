'use client';

import { useEffect, useRef } from 'react';

/**
 * CryptoTrace AI — Clean Authentic Matrix Rain Background
 * Crisp falling binary streams cascading in a continuous smooth 60fps loop
 * without any blurry radial halos, glow blobs, or ambient glare.
 */
interface Stream {
  x: number;
  y: number;
  speed: number;
  fontSize: number;
  length: number;
  chars: string[];
  layer: number; // 0 = background (dim), 1 = midground, 2 = foreground
  mutationTimer: number;
}

export default function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let streams: Stream[] = [];

    // Authentic matrix binary and alphanumeric character pool
    const charsPool = [
      '0', '1', '0', '1', '1', '0', '0', '1', '0', '1', '1', '0',
      '0', '1', '0', '1', '0', '1', '1', '0', '0', '1', '0', '1',
      '2', '3', '4', '5', '6', '7', '8', '9',
      'A', 'B', 'C', 'D', 'E', 'F',
      '0', '1', '0', '1'
    ];

    function getRandomChar() {
      return charsPool[Math.floor(Math.random() * charsPool.length)];
    }

    function createStream(x: number, layer: number): Stream {
      const isForeground = layer === 2;
      const isMidground = layer === 1;

      const fontSize = isForeground ? 14 : isMidground ? 12 : 10;
      const length = Math.floor(Math.random() * 18) + (isForeground ? 16 : 12);
      const chars: string[] = [];
      for (let j = 0; j < length; j++) {
        chars.push(getRandomChar());
      }

      // Smooth downward speed
      const baseSpeed = isForeground
        ? Math.random() * 1.2 + 1.0
        : isMidground
        ? Math.random() * 0.8 + 0.5
        : Math.random() * 0.5 + 0.3;

      return {
        x,
        y: Math.random() * (canvas?.height || window.innerHeight) - 200,
        speed: baseSpeed,
        fontSize,
        length,
        chars,
        layer,
        mutationTimer: Math.floor(Math.random() * 10),
      };
    }

    function initStreams() {
      if (!canvas) return;
      streams = [];

      const width = canvas.width;

      // Background layer (dense, subtle, crisp)
      const bgCols = Math.floor(width / 14);
      for (let i = 0; i < bgCols; i++) {
        streams.push(createStream(i * 14 + (Math.random() * 4 - 2), 0));
      }

      // Midground layer (medium size, clear emerald)
      const midCols = Math.floor(width / 20);
      for (let i = 0; i < midCols; i++) {
        streams.push(createStream(i * 20 + (Math.random() * 6 - 3), 1));
      }

      // Foreground layer (crisp bright green)
      const fgCols = Math.floor(width / 26);
      for (let i = 0; i < fgCols; i++) {
        streams.push(createStream(i * 26 + (Math.random() * 8 - 4), 2));
      }
    }

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStreams();
    }

    let lastTime = performance.now();

    function render(currentTime: number) {
      if (!ctx || !canvas) return;

      const delta = Math.min((currentTime - lastTime) / 16.666, 2.0);
      lastTime = currentTime;

      // Clean dark fade for crisp falling trail without ghost blur
      ctx.fillStyle = 'rgba(2, 11, 6, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < streams.length; i++) {
        const stream = streams[i];

        // Random character mutation
        stream.mutationTimer += delta;
        if (stream.mutationTimer > 6) {
          stream.mutationTimer = 0;
          const mutateIndex = Math.floor(Math.random() * stream.length);
          stream.chars[mutateIndex] = getRandomChar();
        }

        // Draw characters from tail down to leading head
        for (let j = 0; j < stream.length; j++) {
          const charY = stream.y - j * stream.fontSize;

          // Skip offscreen characters
          if (charY < -stream.fontSize || charY > canvas.height + stream.fontSize) {
            continue;
          }

          const isHead = j === 0;
          const isNearHead = j === 1 || j === 2;
          const trailProgress = j / stream.length; // 0 at head, 1 at tail

          ctx.font = `${stream.fontSize}px "JetBrains Mono", "Courier New", monospace`;
          ctx.textAlign = 'center';

          if (isHead) {
            // Clean crisp bright white-green leading head (NO blurry glow balls)
            ctx.fillStyle = stream.layer === 2 ? '#ffffff' : '#e6fffa';
            ctx.fillText(stream.chars[j], stream.x, charY);
          } else if (isNearHead) {
            // Crisp vibrant matrix green
            ctx.fillStyle = stream.layer === 2 ? '#00ff66' : '#10b981';
            ctx.fillText(stream.chars[j], stream.x, charY);
          } else {
            // Smooth natural fade
            let alpha = (1 - trailProgress) * (stream.layer === 2 ? 0.85 : stream.layer === 1 ? 0.6 : 0.3);
            if (alpha < 0.05) alpha = 0.05;

            if (trailProgress < 0.35) {
              ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
            } else if (trailProgress < 0.65) {
              ctx.fillStyle = `rgba(5, 150, 105, ${alpha})`;
            } else {
              ctx.fillStyle = `rgba(4, 120, 87, ${alpha})`;
            }

            ctx.fillText(stream.chars[j], stream.x, charY);
          }
        }

        // Advance stream
        stream.y += stream.speed * delta;

        // Reset stream when it moves past the bottom of the screen
        if (stream.y - stream.length * stream.fontSize > canvas.height) {
          stream.y = -Math.random() * 80;
          stream.speed = stream.layer === 2
            ? Math.random() * 1.2 + 1.0
            : stream.layer === 1
            ? Math.random() * 0.8 + 0.5
            : Math.random() * 0.5 + 0.3;
          for (let k = 0; k < stream.length; k++) {
            stream.chars[k] = getRandomChar();
          }
        }
      }

      animationId = requestAnimationFrame(render);
    }

    resize();
    lastTime = performance.now();
    animationId = requestAnimationFrame(render);

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Deep matrix dark canvas container — clean, no blurry glow halos */}
      <div className="absolute inset-0 bg-[#020b06]" />

      {/* Animated Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.75 }}
      />
    </div>
  );
}

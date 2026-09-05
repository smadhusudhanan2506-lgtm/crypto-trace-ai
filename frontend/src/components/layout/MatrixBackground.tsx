'use client';

import { useEffect, useRef } from 'react';

/**
 * CryptoTrace AI — High-Fidelity Animated Matrix Rain Background
 * Matches deep emerald/matrix green cyber aesthetic with falling binary streams,
 * luminous neon green glowing heads, ambient light halos, and smooth 60fps movement.
 */
interface Stream {
  x: number;
  y: number;
  speed: number;
  fontSize: number;
  length: number;
  chars: string[];
  headGlow: boolean;
  glowNodeIndex: number;
  layer: number; // 0 = background (dim), 1 = midground, 2 = foreground (bright/glowing)
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

    // Binary weighted character set for authentic matrix rain
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
      
      const fontSize = isForeground ? 15 : isMidground ? 13 : 11;
      const length = Math.floor(Math.random() * 20) + (isForeground ? 18 : 14);
      const chars: string[] = [];
      for (let j = 0; j < length; j++) {
        chars.push(getRandomChar());
      }

      // Varied downward speed
      const baseSpeed = isForeground 
        ? Math.random() * 1.3 + 1.2 
        : isMidground 
        ? Math.random() * 0.8 + 0.6 
        : Math.random() * 0.5 + 0.35;

      // Glowing nodes/heads
      const hasHeadGlow = isForeground || (isMidground && Math.random() > 0.35);
      const glowNodeIndex = Math.random() > 0.4 ? Math.floor(Math.random() * Math.min(4, length)) : 0;

      return {
        x,
        y: Math.random() * (canvas?.height || window.innerHeight) - 200,
        speed: baseSpeed,
        fontSize,
        length,
        chars,
        headGlow: hasHeadGlow,
        glowNodeIndex,
        layer,
        mutationTimer: Math.floor(Math.random() * 10),
      };
    }

    function initStreams() {
      if (!canvas) return;
      streams = [];

      const width = canvas.width;

      // Background layer (dense, small, faint emerald)
      const bgCols = Math.floor(width / 14);
      for (let i = 0; i < bgCols; i++) {
        streams.push(createStream(i * 14 + (Math.random() * 6 - 3), 0));
      }

      // Midground layer (medium size, crisp emerald)
      const midCols = Math.floor(width / 22);
      for (let i = 0; i < midCols; i++) {
        streams.push(createStream(i * 22 + (Math.random() * 8 - 4), 1));
      }

      // Foreground layer (large font with bright glowing neon green heads)
      const fgCols = Math.floor(width / 28);
      for (let i = 0; i < fgCols; i++) {
        streams.push(createStream(i * 28 + (Math.random() * 10 - 5), 2));
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

      // Dark emerald fade for smooth trails
      ctx.fillStyle = 'rgba(2, 11, 6, 0.14)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < streams.length; i++) {
        const stream = streams[i];
        
        // Random character mutation
        stream.mutationTimer += delta;
        if (stream.mutationTimer > 5) {
          stream.mutationTimer = 0;
          const mutateIndex = Math.floor(Math.random() * stream.length);
          stream.chars[mutateIndex] = getRandomChar();
        }

        // Draw characters from top of stream down to head
        for (let j = 0; j < stream.length; j++) {
          const charY = stream.y - j * stream.fontSize;

          // Skip offscreen characters
          if (charY < -stream.fontSize || charY > canvas.height + stream.fontSize) {
            continue;
          }

          const isHead = j === stream.glowNodeIndex;
          const isNearHead = j < 3;
          const trailProgress = j / stream.length; // 0 at head, 1 at tail

          ctx.font = `${stream.fontSize}px "JetBrains Mono", "Courier New", monospace`;
          ctx.textAlign = 'center';

          if (isHead && stream.headGlow && stream.layer >= 1) {
            // Glowing head / node effect
            // 1. Soft radial luminous aura behind the glowing node
            const auraRadius = stream.layer === 2 ? 22 : 14;
            const radialGlow = ctx.createRadialGradient(
              stream.x, charY - stream.fontSize / 3, 0,
              stream.x, charY - stream.fontSize / 3, auraRadius
            );
            radialGlow.addColorStop(0, 'rgba(0, 255, 102, 0.55)');
            radialGlow.addColorStop(0.4, 'rgba(0, 255, 102, 0.2)');
            radialGlow.addColorStop(1, 'rgba(0, 255, 102, 0)');
            
            ctx.fillStyle = radialGlow;
            ctx.beginPath();
            ctx.arc(stream.x, charY - stream.fontSize / 3, auraRadius, 0, Math.PI * 2);
            ctx.fill();

            // 2. Head text with neon bloom
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = stream.layer === 2 ? 16 : 9;
            ctx.fillStyle = stream.layer === 2 ? '#ffffff' : '#dcfce7';
            ctx.fillText(stream.chars[j], stream.x, charY);
            ctx.shadowBlur = 0; // reset
          } else if (isNearHead) {
            // Bright green upper trail
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = stream.layer === 2 ? 8 : 0;
            ctx.fillStyle = stream.layer === 2 ? '#00ff66' : '#22c55e';
            ctx.fillText(stream.chars[j], stream.x, charY);
            ctx.shadowBlur = 0;
          } else {
            // Fading trail
            let alpha = (1 - trailProgress) * (stream.layer === 2 ? 0.9 : stream.layer === 1 ? 0.65 : 0.35);
            if (alpha < 0.04) alpha = 0.04;

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

        // Reset stream when it moves past bottom
        if (stream.y - stream.length * stream.fontSize > canvas.height) {
          stream.y = -Math.random() * 80;
          stream.speed = stream.layer === 2 
            ? Math.random() * 1.3 + 1.2 
            : stream.layer === 1 
            ? Math.random() * 0.8 + 0.6 
            : Math.random() * 0.5 + 0.35;
          stream.glowNodeIndex = Math.random() > 0.4 ? Math.floor(Math.random() * 4) : 0;
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
      {/* Base deep matrix background */}
      <div className="absolute inset-0 bg-[#020b06]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_90%_at_50%_20%,rgba(4,36,18,0.45),rgba(2,11,6,0.96))]" />
      
      {/* Animated Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.8 }}
      />
      
      {/* Subtle vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020b06]/85 via-transparent to-[#020b06]/65" />
    </div>
  );
}

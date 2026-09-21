import React, { useRef, useEffect, useState, useCallback } from 'react';

// Dynamic import of all 16 animation frames
const frameModules = import.meta.glob('../assets/animation-frames/*.jpg', { eager: true });

// Sort frames by filename
const frames = Object.entries(frameModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, mod]) => mod.default);

const FPS = 20;
const FRAME_DURATION = 1000 / FPS;

// Pre-load Image objects once at module level
const imageObjects = frames.map((src) => {
  const img = new Image();
  img.src = src;
  return img;
});

/**
 * FrameSequence — Cinematic 16-frame animation player
 *
 * Uses Canvas to render frames so we can paint over the watermark
 * at pixel level — no CSS clipping issues.
 */
export default function FrameSequence({
  autoPlay = false,
  loop = false,
  triggerOnScroll = true,
  className = '',
  style = {},
  onFrameChange,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const frameIndexRef = useRef(0);
  const directionRef = useRef(1);
  const playingRef = useRef(false);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);

  // Wait for all images to load
  useEffect(() => {
    let loaded = 0;
    const total = imageObjects.length;
    if (total === 0) return;

    const check = () => {
      loaded++;
      if (loaded >= total) setAllLoaded(true);
    };

    imageObjects.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        check();
      } else {
        img.addEventListener('load', check, { once: true });
        img.addEventListener('error', check, { once: true });
      }
    });
  }, []);

  // Draw a frame to canvas, painting over the watermark
  const drawFrame = useCallback((index) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = imageObjects[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Draw the full frame
    ctx.drawImage(img, 0, 0, w, h);

    // ── Erase watermark ─────────────────────────────────────────
    // The AI sparkle sits in the bottom-right corner of each frame.
    // We paint a solid rectangle over it, then feather the edge
    // with a gradient so it blends naturally into the dark background.

    // Solid kill zone — covers the sparkle completely
    const killX = w * 0.82;
    const killY = h * 0.78;
    const killW = w - killX;
    const killH = h - killY;

    ctx.fillStyle = '#0b1017';
    ctx.fillRect(killX, killY, killW, killH);

    // Feather blend — soft radial fade from solid color outward
    const grd = ctx.createRadialGradient(w, h, 0, w, h, w * 0.18);
    grd.addColorStop(0,    'rgba(11,16,23,1)');
    grd.addColorStop(0.45, 'rgba(11,16,23,0.85)');
    grd.addColorStop(0.75, 'rgba(11,16,23,0.2)');
    grd.addColorStop(1,    'rgba(11,16,23,0)');

    ctx.fillStyle = grd;
    ctx.fillRect(w * 0.65, h * 0.6, w * 0.35, h * 0.4);
  }, []);

  // Resize canvas to match displayed size
  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width  = rect.width  || 900;
      canvas.height = rect.height || (rect.width ? rect.width * (816 / 1456) : 506);
      drawFrame(frameIndexRef.current);
    }
  }, [drawFrame]);

  // Draw initial frame once images are loaded
  useEffect(() => {
    if (!allLoaded) return;
    syncCanvasSize();
    drawFrame(0);
  }, [allLoaded, syncCanvasSize, drawFrame]);

  // Resize observer
  useEffect(() => {
    const ro = new ResizeObserver(syncCanvasSize);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [syncCanvasSize]);

  // Animation loop
  const animate = useCallback((timestamp) => {
    if (!playingRef.current) return;

    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const elapsed = timestamp - lastTimeRef.current;

    if (elapsed >= FRAME_DURATION) {
      lastTimeRef.current = timestamp;
      frameIndexRef.current += directionRef.current;

      if (frameIndexRef.current >= imageObjects.length - 1) {
        frameIndexRef.current = imageObjects.length - 1;
        directionRef.current = -1;
      } else if (frameIndexRef.current <= 0) {
        frameIndexRef.current = 0;
        directionRef.current = 1;
        if (!loop) {
          playingRef.current = false;
          setIsPlaying(false);
          drawFrame(0);
          return;
        }
      }

      drawFrame(frameIndexRef.current);
      setCurrentFrame(frameIndexRef.current);
      onFrameChange?.(frameIndexRef.current);
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [loop, drawFrame, onFrameChange]);

  const startAnimation = useCallback(() => {
    if (!allLoaded || playingRef.current) return;
    playingRef.current = true;
    directionRef.current = 1;
    lastTimeRef.current = null;
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(animate);
  }, [allLoaded, animate]);

  const stopAnimation = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    frameIndexRef.current = 0;
    drawFrame(0);
    setCurrentFrame(0);
  }, [drawFrame]);

  // Scroll trigger
  useEffect(() => {
    if (!triggerOnScroll || !containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && allLoaded) startAnimation();
        else stopAnimation();
      },
      { threshold: 0.3 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [allLoaded, triggerOnScroll, startAnimation, stopAnimation]);

  // Auto-play
  useEffect(() => {
    if (autoPlay && allLoaded) startAnimation();
  }, [autoPlay, allLoaded, startAnimation]);

  // Cleanup
  useEffect(() => {
    return () => {
      playingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        display: 'block',
        lineHeight: 0,
        ...style,
      }}
      onMouseEnter={() => allLoaded && startAnimation()}
      onMouseLeave={() => stopAnimation()}
      aria-label="Play Together synchronized devices animation"
      role="img"
    >
      {/* Loading skeleton */}
      {!allLoaded && (
        <div
          style={{
            width: '100%',
            paddingBottom: '56.04%', // 816/1456 aspect ratio
            background: 'var(--bg-secondary)',
            borderRadius: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '36px',
              height: '36px',
              border: '2px solid var(--border-subtle)',
              borderTopColor: 'var(--accent-blue)',
              borderRadius: '50%',
              animation: 'rotate-slow 0.9s linear infinite',
            }}
          />
        </div>
      )}

      {/* Canvas — frame is drawn here; watermark is erased in drawFrame() */}
      <canvas
        ref={canvasRef}
        style={{
          display: allLoaded ? 'block' : 'none',
          width: '100%',
          height: 'auto',
          borderRadius: 'inherit',
          userSelect: 'none',
        }}
        aria-hidden="true"
      />
    </div>
  );
}

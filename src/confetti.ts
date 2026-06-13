// Confetti pixelado (cuadros 8-bit) sobre un canvas temporal, sin dependencias.

const COLORS = ['#f97316', '#39ff14', '#00f3ff', '#ff00ff', '#ffe600', '#ffffff'];

export const fireConfetti = (durationMs = 3000) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:100;';
  document.body.appendChild(canvas);
  const c = canvas.getContext('2d')!;

  interface P { x: number; y: number; vx: number; vy: number; size: number; color: string; spin: number; }
  const parts: P[] = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.5,
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 4,
    size: 6 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    spin: Math.random() * Math.PI
  }));

  const t0 = performance.now();
  let raf = 0;
  const tick = (t: number) => {
    c.clearRect(0, 0, canvas.width, canvas.height);
    const fade = Math.max(0, 1 - (t - t0) / durationMs);
    parts.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.spin += 0.1;
      c.globalAlpha = fade;
      c.fillStyle = p.color;
      // cuadro "pixel" que gira aplastándose (fake 3D barato y muy retro)
      const w = p.size * Math.abs(Math.cos(p.spin));
      c.fillRect(p.x - w / 2, p.y - p.size / 2, w, p.size);
    });
    if (t - t0 < durationMs) {
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  };
  raf = requestAnimationFrame(tick);
};

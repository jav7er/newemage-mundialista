import { ParticipantStats } from './types';

// Genera una imagen 1080x1080 del leaderboard en canvas y la comparte
// (Web Share API con fallback a descarga directa).

const px = (size: number) => `${size}px "Press Start 2P", monospace`;

export const shareLeaderboard = async (leaderboard: ParticipantStats[]) => {
  await document.fonts.load(px(40)).catch(() => {});

  const W = 1080, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;

  // Fondo + scanlines
  c.fillStyle = '#000';
  c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 0; y < H; y += 8) c.fillRect(0, y, W, 4);

  // Marco pixel naranja
  c.fillStyle = '#f97316';
  c.fillRect(24, 24, W - 48, 12);
  c.fillRect(24, H - 36, W - 48, 12);
  c.fillRect(24, 24, 12, H - 48);
  c.fillRect(W - 36, 24, 12, H - 48);

  c.textAlign = 'center';
  c.fillStyle = '#f97316';
  c.font = px(52);
  c.fillText('NEW EMAGE', W / 2, 130);
  c.fillStyle = '#fff';
  c.font = px(34);
  c.fillText('MUNDIAL 2026', W / 2, 195);
  c.fillStyle = '#ffe600';
  c.font = px(26);
  c.fillText('🏆 HIGH SCORES 🏆', W / 2, 270);

  const top = leaderboard.slice(0, 6);
  const rowH = 100;
  top.forEach((p, i) => {
    const y = 340 + i * rowH;
    c.fillStyle = i === 0 ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.05)';
    c.fillRect(70, y, W - 140, rowH - 16);

    c.textAlign = 'left';
    c.font = px(30);
    c.fillStyle = i === 0 ? '#f97316' : '#71717a';
    c.fillText(String(i + 1).padStart(2, '0'), 100, y + 54);
    c.fillStyle = '#fff';
    c.fillText(p.nombre.toUpperCase(), 200, y + 54);

    c.textAlign = 'right';
    c.fillStyle = '#39ff14';
    c.fillText(`${p.puntosTotales} PTS`, W - 110, y + 54);
  });

  c.textAlign = 'center';
  c.fillStyle = '#71717a';
  c.font = px(18);
  c.fillText('newemage.com.mx', W / 2, H - 70);

  const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/png'));
  const file = new File([blob], 'quiniela-newemage.png', { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Quiniela Mundial 2026 — New Emage' });
      return;
    } catch {
      // usuario canceló el share: caer a descarga
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quiniela-newemage.png';
  a.click();
  URL.revokeObjectURL(url);
};

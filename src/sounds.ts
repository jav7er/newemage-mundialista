// Efectos de sonido 8-bit sintetizados con WebAudio (sin assets externos).
// El toggle se persiste en localStorage bajo 'ne_sound_on'.

let ctx: AudioContext | null = null;

const getCtx = () => {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

export const soundEnabled = () => localStorage.getItem('ne_sound_on') === '1';

export const setSoundEnabled = (on: boolean) => {
  localStorage.setItem('ne_sound_on', on ? '1' : '0');
};

// Onda cuadrada estilo NES
const beep = (freq: number, start: number, duration: number, volume = 0.08) => {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration);
};

// "Coin" al cambiar de vista (Mario-like: B5 -> E6)
export const playCoin = () => {
  if (!soundEnabled()) return;
  beep(987.77, 0, 0.08);
  beep(1318.51, 0.08, 0.25);
};

// "Power-up" cuando cambia el líder de la quiniela
export const playPowerUp = () => {
  if (!soundEnabled()) return;
  [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => beep(f, i * 0.07, 0.09));
};

// Fanfarria de GOL
export const playGoal = () => {
  if (!soundEnabled()) return;
  [392, 523.25, 659.25, 783.99].forEach((f, i) => beep(f, i * 0.1, 0.12, 0.1));
  beep(1046.5, 0.4, 0.5, 0.12);
};

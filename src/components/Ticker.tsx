import { MatchData, ParticipantStats } from '../types';

interface Props {
  matches: MatchData[];
  leaderboard: ParticipantStats[];
}

// Marquee estilo arcade con resultados y posiciones de la quiniela.
export const Ticker = ({ matches, leaderboard }: Props) => {
  const items: string[] = [];

  matches.forEach(m => {
    const live = m.Estado.toLowerCase() === 'en juego' || m.Estado.toLowerCase() === 'in_play';
    const done = m.Estado.toLowerCase() === 'terminado' || m.Estado.toLowerCase() === 'finished';
    if (live) items.push(`🔴 EN VIVO: ${m["Equipo 1"]} ${m["Goles 1"]}-${m["Goles 2"]} ${m["Equipo 2"]}`);
    else if (done) items.push(`⚽ ${m["Equipo 1"]} ${m["Goles 1"]}-${m["Goles 2"]} ${m["Equipo 2"]}`);
  });

  leaderboard.forEach((p, i) => {
    items.push(`${i === 0 ? '👑' : `P${i + 1}`} ${p.nombre.toUpperCase()} ${p.puntosTotales} PTS`);
  });

  if (items.length === 0) return null;

  const content = items.join('  ★  ');

  return (
    <div className="overflow-hidden bg-black border-y-2 border-zinc-800 py-2 mb-8 select-none" aria-hidden="true">
      <div className="ticker-track whitespace-nowrap text-xs text-[#39ff14] font-terminal text-base">
        {/* contenido duplicado para loop continuo */}
        <span className="pr-16">{content}</span>
        <span className="pr-16">{content}</span>
      </div>
    </div>
  );
};

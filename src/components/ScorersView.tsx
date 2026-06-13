import { Scorer } from '../types';
import { EQUIPO_A_PARTICIPANTE, normalizarTexto, getFlagUrl } from '../data';

interface Props {
  scorers: Scorer[];
  onParticipantClick: (name: string) => void;
  onTeamClick: (name: string) => void;
}

export const ScorersView = ({ scorers, onParticipantClick, onTeamClick }: Props) => {
  return (
    <div className="bg-[#111]/80 p-4 sm:p-8 pixel-border-magenta">
      <h2 className="text-2xl text-[#ff00ff] mb-8 flex items-center gap-3">
        <span>⚽</span> GOLEADORES DEL TORNEO
      </h2>
      
      {scorers.length === 0 ? (
        <div className="text-center text-zinc-500 py-12">No hay datos de goleadores (aún).</div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex text-[10px] text-zinc-500 mb-2 px-4">
            <div className="w-12 text-center">RANK</div>
            <div className="flex-2 flex-grow min-w-[120px]">JUGADOR</div>
            <div className="flex-1 min-w-[100px] hidden sm:block">SELECCIÓN</div>
            <div className="w-16 text-center text-[#ff00ff]">GOLES</div>
            <div className="w-16 text-center text-[#00f3ff] hidden sm:block">ASIST.</div>
          </div>
          
          {scorers.map((s, idx) => {
            const flag = getFlagUrl(s.team.name);
            const owner = EQUIPO_A_PARTICIPANTE[normalizarTexto(s.team.name)] || 'LIBRE';
            
            return (
              <div key={`${s.player.id}-${idx}`} className="flex items-center text-sm bg-zinc-900 p-4 border border-zinc-800 hover:border-[#ff00ff] cursor-pointer transition-colors group/scorer" onClick={() => onTeamClick(s.team.name)}>
                <div className="w-12 text-center">
                  <span className={`text-xl font-bold ${idx === 0 ? 'text-[#ffe600] animate-pulse drop-shadow-[0_0_5px_#ffe600]' : idx < 3 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {idx + 1}
                  </span>
                </div>
                
                <div className="flex-2 flex-grow flex flex-col justify-center min-w-[120px]">
                  <span className="text-white font-bold tracking-wide">{s.player.name}</span>
                  <span className="font-terminal text-sm text-[#ff00ff] block sm:hidden mt-1">{s.team.name} [{owner.toUpperCase()}]</span>
                </div>

                <div className="flex-1 items-center gap-3 min-w-[100px] hidden sm:flex">
                  {flag && <img src={flag} alt={s.team.name} className="w-6 h-4 object-cover pixel-border group-hover/scorer:scale-110 transition-transform" />}
                  <div className="flex flex-col">
                     <span className="text-zinc-300 text-xs truncate group-hover/scorer:text-[#f97316] transition-colors">{s.team.name}</span>
                     <button
                        className="font-terminal text-sm text-[#39ff14] mt-1 w-max px-1 hover:text-[#f97316] transition-colors"
                        onClick={(e) => { e.stopPropagation(); onParticipantClick(owner); }}
                     >[{owner.toUpperCase()}]</button>
                  </div>
                </div>
                
                <div className="w-16 text-center text-xl font-bold text-[#ff00ff] drop-shadow-[0_0_2px_#ff00ff]">
                  {s.goals}
                </div>
                
                <div className="w-16 text-center text-zinc-400 hidden sm:block">
                  {s.assists ?? 0}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

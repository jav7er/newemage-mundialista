import { useEffect } from 'react';
import { motion } from 'motion/react';
import { MatchData, GroupStanding, Scorer } from '../types';
import { getFlagUrl, EQUIPO_A_PARTICIPANTE, normalizarTexto } from '../data';

interface Props {
  teamName: string;
  onClose: () => void;
  matches: MatchData[];
  standings: GroupStanding[];
  scorers: Scorer[];
}

export const TeamModal = ({ teamName, onClose, matches, standings, scorers }: Props) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const normName = normalizarTexto(teamName);
  const owner = EQUIPO_A_PARTICIPANTE[normName] || 'LIBRE';
  const flag = getFlagUrl(teamName);

  const teamMatches = matches.filter(m => m["Equipo 1"] === teamName || m["Equipo 2"] === teamName);
  
  // Find group Standing
  let myGroupInfo: { groupName: string, row: any } | null = null;
  for (const g of standings) {
     const row = g.table.find(r => normalizarTexto(r.team.name) === normName);
     if (row) {
        myGroupInfo = { groupName: g.group, row };
        break;
     }
  }

  // Find Scorers
  const teamScorers = scorers.filter(s => normalizarTexto(s.team.name) === normName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
         initial={{ opacity: 0, scale: 0.9, y: 20 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         exit={{ opacity: 0, scale: 0.9, y: 20 }}
         className="bg-[#111] border-2 border-[#00f3ff] p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto overflow-x-hidden custom-scrollbar relative"
         onClick={e => e.stopPropagation()}
         role="dialog"
         aria-modal="true"
         aria-label={`Detalle de ${teamName}`}
      >
        <button onClick={onClose} aria-label="Cerrar" className="absolute top-3 right-3 text-zinc-400 hover:text-white text-2xl p-2 leading-none">✖</button>
        
        <div className="flex items-center gap-4 mb-6">
           {flag && <img src={flag} alt={teamName} className="w-16 h-10 object-cover pixel-border shadow-[0_0_15px_rgba(0,243,255,0.4)]" />}
           <div>
              <h2 className="text-2xl sm:text-3xl text-white font-bold tracking-widest uppercase">{teamName}</h2>
              <span className="text-xs sm:text-sm text-[#00f3ff] uppercase block mt-1">MANAGER: {owner}</span>
           </div>
        </div>

        {myGroupInfo && (
           <div className="mb-8 border border-zinc-700 bg-black p-4">
              <h3 className="text-[#ffe600] text-sm md:text-base border-b border-zinc-800 pb-2 mb-3 tracking-widest">{myGroupInfo.groupName.replace('_', ' ')}</h3>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                 <div className="text-zinc-400">
                    POSICIÓN: <span className="text-white text-lg font-bold ml-2">{myGroupInfo.row.position}</span>
                 </div>
                 <div className="flex gap-4 sm:gap-6 text-center">
                    <div>
                       <div className="text-[10px] text-zinc-500">PTS</div>
                       <div className="text-[#39ff14] font-bold">{myGroupInfo.row.points}</div>
                    </div>
                    <div>
                       <div className="text-[10px] text-zinc-500">PJ</div>
                       <div className="text-white font-bold">{myGroupInfo.row.playedGames}</div>
                    </div>
                    <div>
                       <div className="text-[10px] text-zinc-500">GF</div>
                       <div className="text-[#00f3ff] font-bold">{myGroupInfo.row.goalsFor}</div>
                    </div>
                    <div>
                       <div className="text-[10px] text-zinc-500">DIF</div>
                       <div className="text-white font-bold">{myGroupInfo.row.goalDifference > 0 ? `+${myGroupInfo.row.goalDifference}` : myGroupInfo.row.goalDifference}</div>
                    </div>
                 </div>
              </div>
           </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div>
              <h3 className="text-lg text-[#ff00ff] mb-4 border-b border-zinc-800 pb-2">PARTIDOS</h3>
              <div className="space-y-3">
                 {teamMatches.map((m, i) => {
                    const isFinished = m.Estado.toLowerCase() === 'terminado' || m.Estado.toLowerCase() === 'finished';
                    const isLive = m.Estado.toLowerCase() === 'en juego' || m.Estado.toLowerCase() === 'in_play';
                    return (
                       <div key={i} className="flex justify-between items-center gap-2 bg-black border border-zinc-800 p-2 font-terminal text-base">
                          <span className="text-[#ff00ff] whitespace-nowrap shrink-0">{m.Fecha}{m.Hora ? ` ${m.Hora}` : ''}</span>
                          <div className="flex-1 text-center truncate">
                             <span className={m["Equipo 1"] === teamName ? 'text-white font-bold' : 'text-zinc-400'}>
                                {m["Equipo 1"]}
                             </span>
                             <span className="mx-1 text-zinc-600">vs</span>
                             <span className={m["Equipo 2"] === teamName ? 'text-white font-bold' : 'text-zinc-400'}>
                                {m["Equipo 2"]}
                             </span>
                          </div>
                          <span className={`text-right font-bold whitespace-nowrap shrink-0 ${isLive ? 'text-[#39ff14]' : 'text-zinc-300'}`}>
                              {isFinished || isLive ? `${m["Goles 1"]} - ${m["Goles 2"]}` : '-'}
                          </span>
                       </div>
                    )
                 })}
                 {teamMatches.length === 0 && <div className="text-zinc-600 text-xs">No hay partidos registrados.</div>}
              </div>
           </div>

           <div>
              <h3 className="text-lg text-[#39ff14] mb-4 border-b border-zinc-800 pb-2">ANOTADORES</h3>
              <div className="space-y-2">
                 {teamScorers.length > 0 ? teamScorers.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-black border border-zinc-800 p-2">
                       <span className="text-white text-xs truncate max-w-[120px] sm:max-w-[180px]">{s.player.name}</span>
                       <span className="text-[#39ff14] font-bold text-sm">{s.goals} ⚽</span>
                    </div>
                 )) : (
                    <div className="text-zinc-600 text-xs text-center py-4 border border-zinc-800 bg-black">
                       Aún no hay goles registrados
                    </div>
                 )}
              </div>
           </div>
        </div>

      </motion.div>
    </div>
  );
};

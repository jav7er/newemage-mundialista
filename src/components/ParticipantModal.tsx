import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ParticipantStats, MatchData } from '../types';
import { PARTICIPANTES, getFlagUrl } from '../data';

interface Props {
  participant: ParticipantStats;
  onClose: () => void;
  matches: MatchData[];
}

export const ParticipantModal = ({ participant, onClose, matches }: Props) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Find their teams
  const teams = Object.entries(PARTICIPANTES).find(([k]) => k.toLowerCase() === participant.nombre.toLowerCase())?.[1] || [];

  const teamStatsRecord = teams.map(teamName => {
    // Calculamos estadisticas rapídas para cada equipo a partir de los partidos
    const teamMatches = matches.filter(m => m["Equipo 1"] === teamName || m["Equipo 2"] === teamName);
    const finishedMatches = teamMatches.filter(m => m.Estado.toLowerCase() === 'terminado' || m.Estado.toLowerCase() === 'finished');
    
    let pts = 0;
    let gf = 0;
    let gc = 0;
    
    finishedMatches.forEach(m => {
       const isHome = m["Equipo 1"] === teamName;
       const gFav = isHome ? m["Goles 1"] : m["Goles 2"];
       const gCon = isHome ? m["Goles 2"] : m["Goles 1"];
       
       if (gFav !== '-' && gCon !== '-') {
         const gfNum = Number(gFav);
         const gcNum = Number(gCon);
         gf += gfNum;
         gc += gcNum;
         if (gfNum > gcNum) pts += 3;
         else if (gfNum === gcNum) pts += 1;
       }
    });

    return {
       name: teamName,
       pts, gf, gc, 
       matches: teamMatches
    };
  }).sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
         initial={{ opacity: 0, scale: 0.9, y: 20 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         exit={{ opacity: 0, scale: 0.9, y: 20 }}
         className="bg-[#111] border-2 border-[#f97316] p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto overflow-x-hidden custom-scrollbar relative"
         onClick={e => e.stopPropagation()}
         role="dialog"
         aria-modal="true"
         aria-label={`Detalle de ${participant.nombre}`}
      >
        <button onClick={onClose} aria-label="Cerrar" className="absolute top-3 right-3 text-zinc-400 hover:text-white text-2xl p-2 leading-none">✖</button>
        
        <h2 className="text-3xl text-[#f97316] mb-2 uppercase tracking-widest">{participant.nombre}</h2>
        <div className="flex gap-2 flex-wrap mb-6">
           {participant.badges.map(b => (
             <span key={b} className={`px-2 py-1 text-[10px] uppercase border bg-black ${b.includes('Lider') ? 'border-[#ffe600] text-[#ffe600]' : b.includes('Goleador') ? 'border-[#39ff14] text-[#39ff14]' : b.includes('Defensota') ? 'border-[#00f3ff] text-[#00f3ff]' : 'border-[#ff003c] text-[#ff003c]'}`}>
               {b}
             </span>
           ))}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
           <div className="bg-black border border-zinc-800 p-4 text-center">
             <div className="text-[10px] text-zinc-500 mb-1">PUNTOS</div>
             <div className="text-2xl text-[#39ff14]">{participant.puntosTotales}</div>
           </div>
           <div className="bg-black border border-zinc-800 p-4 text-center">
             <div className="text-[10px] text-zinc-500 mb-1">GOLES A FAVOR</div>
             <div className="text-2xl text-[#00f3ff]">{participant.golesAFavor}</div>
           </div>
           <div className="bg-black border border-zinc-800 p-4 text-center">
             <div className="text-[10px] text-zinc-500 mb-1">EQUIPOS VIVOS</div>
             <div className="text-2xl text-[#ffe600]">{participant.equiposVivos}</div>
           </div>
        </div>

        <h3 className="text-xl text-[#00f3ff] mb-4 border-b border-zinc-800 pb-2">RENDIMIENTO POR EQUIPO</h3>
        <div className="space-y-4">
           {teamStatsRecord.map(ts => {
             const flag = getFlagUrl(ts.name);
             return (
               <div key={ts.name} className="bg-black border border-zinc-800 p-4">
                 <div className="flex justify-between items-center mb-3 border-b border-zinc-900 pb-2">
                    <div className="flex items-center gap-3">
                       {flag && <img src={flag} alt={ts.name} className="w-8 h-5 object-cover pixel-border" />}
                       <span className="text-lg text-white font-bold tracking-wide">{ts.name}</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                       <span className="text-[#ffe600]">PTS: {ts.pts}</span>
                       <span className="text-[#39ff14]">GF: {ts.gf}</span>
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    {ts.matches.slice(0, 3).map((m, i) => { // show last 3 matches or all
                       const isHome = m["Equipo 1"] === ts.name;
                       const opponent = isHome ? m["Equipo 2"] : m["Equipo 1"];
                       const isFinished = m.Estado.toLowerCase() === 'terminado' || m.Estado.toLowerCase() === 'finished';
                       return (
                         <div key={i} className="flex justify-between items-center gap-2 font-terminal text-base text-zinc-300">
                            <span className="text-[#ff00ff] whitespace-nowrap shrink-0">{m.Fecha}{m.Hora ? ` ${m.Hora}` : ''}</span>
                            <span className="flex-1 truncate">vs {opponent}</span>
                            <span className="text-right font-bold text-white whitespace-nowrap shrink-0">
                               {isFinished ? `${m["Goles 1"]} - ${m["Goles 2"]}` : m.Estado}
                            </span>
                         </div>
                       )
                    })}
                    {ts.matches.length === 0 && <span className="font-terminal text-base text-zinc-500">No hay partidos registrados.</span>}
                 </div>
               </div>
             )
           })}
        </div>
      </motion.div>
    </div>
  );
};

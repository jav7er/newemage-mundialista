import { useEffect, useMemo, useRef, useState } from 'react';
import { MatchData } from '../types';
import { EQUIPO_A_PARTICIPANTE, PARTICIPANTES, normalizarTexto, getFlagUrl } from '../data';
import { formatHumanDate, toLocalDateStr } from '../logic';

interface Props {
  matches: MatchData[];
  onParticipantClick: (name: string) => void;
  onTeamClick: (name: string) => void;
}

export const MatchesView = ({ matches, onParticipantClick, onTeamClick }: Props) => {
  const [filter, setFilter] = useState<string>('TODOS');
  const todayRef = useRef<HTMLDivElement | null>(null);
  const todayStr = toLocalDateStr(new Date());

  const filtered = useMemo(() => {
    if (filter === 'TODOS') return matches;
    const teams = new Set(
      (PARTICIPANTES[filter as keyof typeof PARTICIPANTES] || []).map(normalizarTexto)
    );
    return matches.filter(m =>
      teams.has(normalizarTexto(m["Equipo 1"])) || teams.has(normalizarTexto(m["Equipo 2"]))
    );
  }, [matches, filter]);

  const dates: string[] = Array.from(new Set<string>(filtered.map(m => m.Fecha))).sort();

  // Al entrar (o cambiar filtro), saltar al día de hoy si existe
  useEffect(() => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [filter]);

  return (
    <div className="bg-[#111]/80 p-4 sm:p-8 pixel-border-cyan">
      <h2 className="text-2xl text-[#00f3ff] mb-6 flex items-center gap-3">
        <span>📅</span> CALENDARIO DE PARTIDOS
      </h2>

      {/* FILTRO POR PARTICIPANTE */}
      <div className="flex flex-wrap gap-2 mb-8">
        {['TODOS', ...Object.keys(PARTICIPANTES)].map(name => (
          <button
            key={name}
            onClick={() => setFilter(name)}
            className={`px-3 py-2 text-[10px] tracking-widest transition-colors border-2 ${
              filter === name
                ? 'bg-[#00f3ff] text-black border-[#00f3ff]'
                : 'bg-black text-zinc-400 border-zinc-700 hover:border-[#00f3ff] hover:text-white'
            }`}
          >
            {name.toUpperCase()}
          </button>
        ))}
      </div>

      {dates.length === 0 ? (
        <div className="text-center text-zinc-400 py-12 font-terminal text-lg">No hay partidos disponibles.</div>
      ) : (
        <div className="space-y-12">
          {dates.map(date => {
            const dayMatches = filtered.filter(m => m.Fecha === date);
            const isToday = date === todayStr;
            return (
              <div key={date} ref={isToday ? todayRef : undefined}>
                <h3 className="text-[#ff00ff] text-base sm:text-xl border-b-2 border-zinc-800 pb-2 mb-4 drop-shadow-[0_0_5px_#ff00ff] flex items-center gap-3 flex-wrap">
                  {formatHumanDate(date)}
                  {isToday && <span className="text-[10px] bg-[#39ff14] text-black px-2 py-1 animate-blink">★ HOY</span>}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dayMatches.map((m, idx) => {
                    const isFinished = m.Estado.toLowerCase() === 'terminado' || m.Estado.toLowerCase() === 'finished';
                    const isLive = m.Estado.toLowerCase() === 'en juego' || m.Estado.toLowerCase() === 'in_play';
                    const f1 = getFlagUrl(m["Equipo 1"]);
                    const f2 = getFlagUrl(m["Equipo 2"]);
                    const o1 = EQUIPO_A_PARTICIPANTE[normalizarTexto(m["Equipo 1"])] || 'LIBRE';
                    const o2 = EQUIPO_A_PARTICIPANTE[normalizarTexto(m["Equipo 2"])] || 'LIBRE';

                    return (
                      <div key={idx} className={`p-4 border-2 flex flex-col ${isLive ? 'border-[#39ff14] bg-[#39ff14]/10' : isFinished ? 'border-zinc-700 bg-black/40' : 'border-[#00f3ff] bg-[#00f3ff]/10'}`}>
                        <div className="font-terminal text-sm text-zinc-300 mb-4 flex justify-between">
                          <span className={isLive ? 'text-[#39ff14] animate-pulse' : ''}>{m.Estado.toUpperCase()}</span>
                          {m.Hora && <span className="text-[#00f3ff]">🕐 {m.Hora} hrs</span>}
                        </div>

                        <div className="flex justify-between items-center w-full mb-2">
                           <div className="flex flex-col items-center w-5/12 cursor-pointer group/team" onClick={() => onTeamClick(m["Equipo 1"])}>
                              {f1 ? <img src={f1} alt={m["Equipo 1"]} className="w-10 h-6 object-cover pixel-border mb-2 group-hover/team:scale-110 transition-transform" /> : <div className="w-10 h-6 bg-zinc-800 pixel-border mb-2 group-hover/team:scale-110 transition-transform" />}
                              <span className={`text-xs text-center line-clamp-1 group-hover/team:text-[#f97316] transition-colors ${isFinished && m["Goles 1"] > m["Goles 2"] ? 'text-[#ffe600]' : 'text-white'}`}>{m["Equipo 1"]}</span>
                              <button
                                 className="font-terminal text-sm text-[#39ff14] mt-1 px-2 py-1 hover:text-[#f97316] transition-colors"
                                 onClick={(e) => { e.stopPropagation(); onParticipantClick(o1); }}
                              >[{o1}]</button>
                           </div>

                           <div className="w-2/12 text-center text-lg font-bold">
                              {isFinished || isLive ? (
                                 <span className={isLive ? 'text-[#39ff14]' : 'text-white'}>{m["Goles 1"]} - {m["Goles 2"]}</span>
                               ) : (
                                 <span className="text-zinc-500 text-xs">VS</span>
                               )}
                           </div>

                           <div className="flex flex-col items-center w-5/12 cursor-pointer group/team" onClick={() => onTeamClick(m["Equipo 2"])}>
                              {f2 ? <img src={f2} alt={m["Equipo 2"]} className="w-10 h-6 object-cover pixel-border mb-2 group-hover/team:scale-110 transition-transform" /> : <div className="w-10 h-6 bg-zinc-800 pixel-border mb-2 group-hover/team:scale-110 transition-transform" />}
                              <span className={`text-xs text-center line-clamp-1 group-hover/team:text-[#f97316] transition-colors ${isFinished && m["Goles 2"] > m["Goles 1"] ? 'text-[#ffe600]' : 'text-white'}`}>{m["Equipo 2"]}</span>
                              <button
                                 className="font-terminal text-sm text-[#39ff14] mt-1 px-2 py-1 hover:text-[#f97316] transition-colors"
                                 onClick={(e) => { e.stopPropagation(); onParticipantClick(o2); }}
                              >[{o2}]</button>
                           </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import { motion, AnimatePresence } from 'motion/react';
import { MatchData, ParticipantStats, PronosticoStats } from '../types';
import { EQUIPO_A_PARTICIPANTE, normalizarTexto, getFlagUrl } from '../data';
import { buildBracket } from '../logic';
import { BracketView } from './BracketView';
import { PronosticoView } from './PronosticoView';

interface Props {
  featured: MatchData[];
  leaderboard: ParticipantStats[];
  matches: MatchData[];
  pronosticos: PronosticoStats[];
  onParticipantClick: (name: string) => void;
  onTeamClick: (name: string) => void;
  onShare: () => void;
}

export const DashboardView = ({ featured, leaderboard, matches, pronosticos, onParticipantClick, onTeamClick, onShare }: Props) => {
  const bracketRounds = buildBracket(matches);
  return (
    <>
      {/* 1. PARTIDOS DESTACADOS */}
      {featured.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-12"
        >
          <h3 className="text-xl text-[#00f3ff] mb-4 text-center">🔥 PARTIDOS DESTACADOS 🔥</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {featured.map((m, i) => {
                const owner1 = EQUIPO_A_PARTICIPANTE[normalizarTexto(m["Equipo 1"])] || 'LIBRE';
                const owner2 = EQUIPO_A_PARTICIPANTE[normalizarTexto(m["Equipo 2"])] || 'LIBRE';
                const f1 = getFlagUrl(m["Equipo 1"]);
                const f2 = getFlagUrl(m["Equipo 2"]);

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-[#111] p-4 pixel-border-cyan flex flex-col justify-between relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#00f3ff]/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="text-center text-[10px] text-[#ff00ff] mb-3 z-10">
                      {m.Fecha}{m.Hora ? ` · ${m.Hora}` : ''} | {m.Estado.toUpperCase()}
                    </div>

                    <div className="flex justify-between items-center z-10 w-full mb-2">
                      <div className="flex flex-col items-center w-5/12 cursor-pointer group/team" onClick={() => onTeamClick(m["Equipo 1"])}>
                        {f1 ? <img src={f1} alt={m["Equipo 1"]} className="w-12 h-8 object-cover pixel-border mb-2 group-hover/team:scale-110 transition-transform" /> : <div className="w-12 h-8 bg-zinc-800 pixel-border mb-2" />}
                        <span className="text-xs text-center text-white line-clamp-1 group-hover/team:text-[#f97316] transition-colors">{m["Equipo 1"]}</span>
                        <button
                          className="font-terminal text-sm text-[#39ff14] mt-1 px-2 py-1 hover:text-[#f97316] transition-colors"
                          onClick={e => { e.stopPropagation(); onParticipantClick(owner1); }}
                        >[{owner1}]</button>
                      </div>

                      <div className="w-2/12 text-center text-xl text-[#ffe600] font-bold">
                        {m["Goles 1"] !== '-' ? `${m["Goles 1"]} - ${m["Goles 2"]}` : 'VS'}
                      </div>

                      <div className="flex flex-col items-center w-5/12 cursor-pointer group/team" onClick={() => onTeamClick(m["Equipo 2"])}>
                        {f2 ? <img src={f2} alt={m["Equipo 2"]} className="w-12 h-8 object-cover pixel-border mb-2 group-hover/team:scale-110 transition-transform" /> : <div className="w-12 h-8 bg-zinc-800 pixel-border mb-2" />}
                        <span className="text-xs text-center text-white line-clamp-1 group-hover/team:text-[#f97316] transition-colors">{m["Equipo 2"]}</span>
                        <button
                          className="font-terminal text-sm text-[#39ff14] mt-1 px-2 py-1 hover:text-[#f97316] transition-colors"
                          onClick={e => { e.stopPropagation(); onParticipantClick(owner2); }}
                        >[{owner2}]</button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* 2. LLAVES DE ELIMINACIÓN */}
      <BracketView rounds={bracketRounds} onParticipantClick={onParticipantClick} onTeamClick={onTeamClick} />

      {/* 3. HIGH SCORES (leaderboard con panel de equipos vivos) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 bg-[#111]/80 p-4 sm:p-6 pixel-border-yellow"
      >
        <h3 className="text-xl md:text-2xl text-[#ffe600] mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <span className="flex items-center gap-3"><span>🏆</span> HIGH SCORES</span>
          <span className="flex items-center gap-3">
            <span className="text-[10px] md:text-xs">PTS / GF / GC</span>
            <button
              onClick={onShare}
              className="text-[10px] px-3 py-2 bg-black text-[#ffe600] border-2 border-[#ffe600] hover:bg-[#ffe600] hover:text-black transition-colors"
              aria-label="Compartir tabla de posiciones"
            >
              📤 COMPARTIR
            </button>
          </span>
        </h3>

        <div className="space-y-4">
          {leaderboard.map((p, idx) => (
            <motion.div
              key={p.nombre}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * idx }}
              whileHover={{ x: 10, backgroundColor: 'rgba(57, 255, 20, 0.1)' }}
              onClick={() => onParticipantClick(p.nombre)}
              className={`p-3 sm:p-4 border-2 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-colors relative overflow-hidden group cursor-pointer ${idx === 0 ? 'border-[#f97316] bg-[#f97316]/10' : 'border-zinc-700 hover:border-[#f97316]'}`}
            >
              <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-[#f97316] to-transparent opacity-0 group-hover:opacity-100" />

              <div className="flex items-start gap-3 md:gap-6 z-10 w-full md:w-auto">
                <span className={`text-xl md:text-2xl mt-1 ${idx === 0 ? 'text-[#f97316] animate-pulse drop-shadow-[0_0_5px_#f97316]' : 'text-zinc-500'}`}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-col flex-1">
                  <span className="text-lg md:text-xl tracking-wider text-white">
                    {p.nombre.toUpperCase()}
                  </span>
                  {p.badges.length > 0 && (
                    <div className="flex gap-2 text-xs flex-wrap mt-2">
                      {p.badges.map(b => (
                        <span key={b} className={`px-2 py-1 text-[8px] uppercase border bg-black ${b.includes('Lider') ? 'border-[#ffe600] text-[#ffe600]' : b.includes('Goleador') ? 'border-[#39ff14] text-[#39ff14]' : b.includes('Defensota') ? 'border-[#00f3ff] text-[#00f3ff]' : 'border-[#ff003c] text-[#ff003c]'}`}>
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* PANEL DE EQUIPOS VIVOS */}
                  {p.equipos && p.equipos.length > 0 && (
                    <div className="mt-3">
                      <div className="font-terminal text-[11px] text-zinc-400 mb-1.5 flex items-center gap-2">
                        <span className={p.equiposVivos > 0 ? 'text-[#39ff14]' : 'text-[#ff003c]'}>
                          {p.equiposVivos}/{p.equipos.length} VIVOS
                        </span>
                        {p.equiposVivos === 0 && <span className="text-[#ff003c]">💀 ELIMINADO</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {p.equipos.map(eq => {
                          const flag = getFlagUrl(eq.nombre);
                          return (
                            <div
                              key={eq.nombre}
                              title={`${eq.nombre}${eq.vivo ? ' (vivo)' : ' (eliminado)'}`}
                              onClick={e => { e.stopPropagation(); onTeamClick(eq.nombre); }}
                              className={`relative ${eq.vivo ? '' : 'opacity-40'}`}
                            >
                              {flag
                                ? <img src={flag} alt={eq.nombre} className={`w-7 h-5 object-cover pixel-border transition-transform hover:scale-110 ${eq.vivo ? 'ring-1 ring-[#39ff14]' : 'grayscale'}`} />
                                : <div className="w-7 h-5 bg-zinc-800 pixel-border" />}
                              {!eq.vivo && (
                                <span className="absolute inset-0 flex items-center justify-center text-[#ff003c] text-[10px] font-bold leading-none">✕</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end z-10 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800 shrink-0">
                <div className="text-xl md:text-2xl font-bold flex gap-4 md:gap-6 w-full md:w-auto justify-end">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-zinc-500 mb-1 leading-none">PTS</span>
                    <span className="text-[#39ff14] text-right">{p.puntosTotales}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-zinc-500 mb-1 leading-none">GF</span>
                    <span className="text-[#00f3ff] text-right">{p.golesAFavor}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-zinc-500 mb-1 leading-none">GC</span>
                    <span className="text-[#ff003c] text-right">{p.golesEnContra}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 4. PRONÓSTICO */}
      <PronosticoView pronosticos={pronosticos} onParticipantClick={onParticipantClick} onTeamClick={onTeamClick} />
    </>
  );
};

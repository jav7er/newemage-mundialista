import { FC } from 'react';
import { motion } from 'motion/react';
import { PronosticoStats } from '../types';
import { getFlagUrl, getParticipanteColor, PARTICIPANTE_COLOR } from '../data';

interface Props {
  pronosticos: PronosticoStats[];
  onParticipantClick: (name: string) => void;
  onTeamClick: (name: string) => void;
}

const Bar: FC<{ value: number; color: string; label: string }> = ({ value, color, label }) => (
  <div className="flex items-center gap-2 text-[11px]">
    <span className="w-16 text-zinc-400 shrink-0">{label}</span>
    <div className="flex-1 h-2 bg-zinc-900 rounded-none relative overflow-hidden">
      <motion.div
        className="h-full absolute left-0 top-0"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
    <span className="w-9 text-right font-bold" style={{ color }}>{value.toFixed(0)}</span>
  </div>
);

const getMedal = (idx: number) => {
  if (idx === 0) return '🥇';
  if (idx === 1) return '🥈';
  if (idx === 2) return '🥉';
  return `${String(idx + 1).padStart(2, '0')}`;
};

export const PronosticoView: FC<Props> = ({ pronosticos, onParticipantClick, onTeamClick }) => {
  if (pronosticos.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 bg-[#111]/80 p-4 sm:p-6 pixel-border-cyan"
    >
      <h3 className="text-xl md:text-2xl text-[#00f3ff] mb-2 flex items-center gap-3">
        <span>📊</span> PRONÓSTICO — POSIBILIDADES DE GANAR
      </h3>
      <p className="font-terminal text-[11px] text-zinc-500 mb-6 leading-relaxed">
        Calculado con: <span className="text-[#00f3ff]">60 % ranking FIFA</span> de equipos vivos ·{' '}
        <span className="text-[#39ff14]">30 % rendimiento en eliminatoria</span> (puntos + diferencia de goles) ·{' '}
        <span className="text-[#ffe600]">10 % equipos vivos</span> restantes.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pronosticos.map((p, idx) => {
          const color = getParticipanteColor(p.nombre);
          const vivos = p.equipos.filter(e => e.vivo);
          const eliminados = p.equipos.filter(e => !e.vivo);

          return (
            <motion.div
              key={p.nombre}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-black/60 border-2 p-4 cursor-pointer hover:bg-white/5 transition-colors"
              style={{ borderColor: color }}
              onClick={() => onParticipantClick(p.nombre)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getMedal(idx)}</span>
                  <div>
                    <div className="text-lg tracking-wider font-bold" style={{ color }}>
                      {p.nombre.toUpperCase()}
                    </div>
                    <div className="font-terminal text-[11px] text-zinc-400">
                      MEJOR EQUIPO: <span className="text-white">{p.mejorEquipo}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color }}>
                    {p.scoreTotal.toFixed(1)}
                  </div>
                  <div className="font-terminal text-[10px] text-zinc-500">/ 100 PTS</div>
                </div>
              </div>

              {/* Barra total */}
              <div className="mb-3">
                <div className="h-3 bg-zinc-900 w-full relative overflow-hidden mb-1">
                  <motion.div
                    className="h-full absolute left-0 top-0"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.scoreTotal}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Desglose barras */}
              <div className="space-y-1.5 mb-4">
                <Bar value={p.scoreFifa}   color="#00f3ff" label="FIFA" />
                <Bar value={p.scoreTorneo} color="#39ff14" label="Torneo" />
                <Bar value={p.scoreVivos}  color="#ffe600" label="Vivos" />
              </div>

              {/* Equipos vivos con próximo rival */}
              {vivos.length > 0 && (
                <div>
                  <div className="font-terminal text-[10px] text-zinc-400 mb-2 flex items-center gap-2">
                    <span className="text-[#39ff14]">▶ {vivos.length} VIVOS</span>
                    {eliminados.length > 0 && <span className="text-zinc-600">· {eliminados.length} eliminados</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {vivos.map(eq => {
                      const flag = getFlagUrl(eq.nombre);
                      return (
                        <div
                          key={eq.nombre}
                          className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 border border-zinc-700 hover:border-[#39ff14] transition-colors cursor-pointer group"
                          onClick={e => { e.stopPropagation(); onTeamClick(eq.nombre); }}
                          title={eq.proximoRival ? `Próximo: vs ${eq.proximoRival}` : 'Sin rival asignado aún'}
                        >
                          {flag && (
                            <img src={flag} alt={eq.nombre}
                              className="w-6 h-4 object-cover pixel-border group-hover:scale-110 transition-transform"
                            />
                          )}
                          <div>
                            <div className="text-[10px] text-white leading-none">{eq.nombre}</div>
                            <div className="font-terminal text-[10px] leading-none mt-0.5">
                              <span className="text-zinc-500">#{eq.fifaRank}</span>
                              {eq.proximoRival && (
                                <span className="text-[#ff00ff] ml-1">vs {eq.proximoRival}</span>
                              )}
                              {eq.knockoutPts > 0 && (
                                <span className="text-[#39ff14] ml-1">{eq.knockoutPts}pts</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {p.equiposVivos === 0 && (
                <div className="font-terminal text-[#ff003c] text-sm mt-2">💀 TODOS LOS EQUIPOS ELIMINADOS</div>
              )}
            </motion.div>
          );
        })}
      </div>

      <p className="font-terminal text-[10px] text-zinc-600 mt-4 text-center">
        * Pronóstico calculado con datos en vivo. Se actualiza cada minuto.
      </p>
    </motion.div>
  );
};

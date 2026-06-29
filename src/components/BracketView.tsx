import { FC } from 'react';
import { motion } from 'motion/react';
import { BracketRound, MatchData } from '../types';
import { EQUIPO_A_PARTICIPANTE, normalizarTexto, getFlagUrl, getParticipanteColor } from '../data';

interface Props {
  rounds: BracketRound[];
  onParticipantClick: (name: string) => void;
  onTeamClick: (name: string) => void;
}

const isFinished = (m: MatchData) =>
  m.Estado.toLowerCase() === 'terminado' || m.Estado.toLowerCase() === 'finished';
const isLive = (m: MatchData) =>
  m.Estado.toLowerCase() === 'en juego' || m.Estado.toLowerCase() === 'in_play';

// ¿Ganó este lado? (incluye penales vía m.Ganador)
const sideWon = (m: MatchData, side: 'HOME' | 'AWAY') => {
  if (!isFinished(m)) return false;
  if (m.Ganador) return m.Ganador === side;
  const g1 = parseInt(m["Goles 1"], 10);
  const g2 = parseInt(m["Goles 2"], 10);
  if (isNaN(g1) || isNaN(g2)) return false;
  return side === 'HOME' ? g1 > g2 : g2 > g1;
};

const sideLost = (m: MatchData, side: 'HOME' | 'AWAY') => {
  if (!isFinished(m)) return false;
  return sideWon(m, side === 'HOME' ? 'AWAY' : 'HOME');
};

interface TeamRowProps { m: MatchData; side: 'HOME' | 'AWAY'; onParticipantClick: (n: string) => void; onTeamClick: (n: string) => void; }
const TeamRow: FC<TeamRowProps> = ({ m, side, onParticipantClick, onTeamClick }) => {
  const team = side === 'HOME' ? m["Equipo 1"] : m["Equipo 2"];
  const goles = side === 'HOME' ? m["Goles 1"] : m["Goles 2"];
  const owner = EQUIPO_A_PARTICIPANTE[normalizarTexto(team)] || '';
  const color = getParticipanteColor(owner);
  const flag = getFlagUrl(team);
  const won = sideWon(m, side);
  const lost = sideLost(m, side);

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 transition-colors cursor-pointer hover:bg-white/5 ${lost ? 'opacity-40' : ''}`}
      style={{ borderLeft: `3px solid ${color}` }}
      onClick={() => onTeamClick(team)}
    >
      {flag
        ? <img src={flag} alt={team} className={`w-6 h-4 object-cover pixel-border flex-shrink-0 ${lost ? 'grayscale' : ''}`} />
        : <div className="w-6 h-4 bg-zinc-800 pixel-border flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] truncate ${won ? 'text-[#ffe600] font-bold' : lost ? 'text-zinc-500 line-through' : 'text-white'}`}>
          {team}
        </div>
        {owner && (
          <button
            className="font-terminal text-[11px] leading-none mt-0.5 hover:text-[#f97316] transition-colors"
            style={{ color }}
            onClick={(e) => { e.stopPropagation(); onParticipantClick(owner); }}
          >[{owner.toUpperCase()}]</button>
        )}
      </div>
      <span className={`text-sm font-bold w-5 text-center flex-shrink-0 ${won ? 'text-[#ffe600]' : 'text-zinc-400'}`}>
        {goles !== '-' && goles !== undefined ? goles : ''}
      </span>
    </div>
  );
};

interface MatchCardProps { m: MatchData; onParticipantClick: (n: string) => void; onTeamClick: (n: string) => void; }
const MatchCard: FC<MatchCardProps> = ({ m, onParticipantClick, onTeamClick }) => {
  const live = isLive(m);
  return (
    <div className={`bg-black/60 border-2 ${live ? 'border-[#39ff14] shadow-[0_0_8px_#39ff14]' : 'border-zinc-700'} w-[180px]`}>
      <div className={`text-[9px] text-center py-0.5 ${live ? 'bg-[#39ff14] text-black animate-pulse' : 'bg-zinc-800 text-zinc-400'}`}>
        {live ? 'EN JUEGO' : m.Fecha || ''}{!live && m.Hora ? ` · ${m.Hora}` : ''}
      </div>
      <TeamRow m={m} side="HOME" onParticipantClick={onParticipantClick} onTeamClick={onTeamClick} />
      <div className="h-px bg-zinc-800" />
      <TeamRow m={m} side="AWAY" onParticipantClick={onParticipantClick} onTeamClick={onTeamClick} />
    </div>
  );
};

const PlaceholderCard: FC = () => (
  <div className="bg-black/30 border-2 border-dashed border-zinc-800 w-[180px] h-[68px] flex items-center justify-center">
    <span className="text-[10px] text-zinc-600 tracking-widest">POR DEFINIR</span>
  </div>
);

export const BracketView = ({ rounds, onParticipantClick, onTeamClick }: Props) => {
  if (rounds.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 bg-[#111]/80 p-4 sm:p-6 pixel-border-magenta"
    >
      <h3 className="text-xl md:text-2xl text-[#ff00ff] mb-2 flex items-center gap-3">
        <span>🏆</span> LLAVES DE ELIMINACIÓN
      </h3>
      <p className="font-terminal text-sm text-zinc-400 mb-6">
        Cada equipo muestra a su dueño. <span className="text-[#ffe600]">Amarillo</span> = clasificó · <span className="text-zinc-500 line-through">tachado</span> = eliminado.
      </p>

      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-6 min-w-max">
          {rounds.map((round) => {
            const placeholders = Math.max(0, round.expectedCount - round.matches.length);
            return (
              <div key={round.stage} className="flex flex-col">
                <div className="text-center text-[11px] text-[#00f3ff] tracking-widest mb-3 border-b-2 border-zinc-800 pb-2">
                  {round.label}
                </div>
                <div className="flex flex-col gap-3 flex-1 justify-around">
                  {round.matches.map((m, i) => (
                    <MatchCard key={i} m={m} onParticipantClick={onParticipantClick} onTeamClick={onTeamClick} />
                  ))}
                  {Array.from({ length: placeholders }).map((_, i) => (
                    <PlaceholderCard key={`ph-${i}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

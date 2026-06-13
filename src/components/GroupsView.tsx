import { GroupStanding } from '../types';
import { EQUIPO_A_PARTICIPANTE, normalizarTexto, getFlagUrl } from '../data';

interface Props {
  groups: GroupStanding[];
  onParticipantClick: (name: string) => void;
  onTeamClick: (name: string) => void;
}

export const GroupsView = ({ groups, onParticipantClick, onTeamClick }: Props) => {
  return (
    <div className="bg-[#111]/80 p-4 sm:p-8 pixel-border-yellow">
      <h2 className="text-2xl text-[#ffe600] mb-8 flex items-center gap-3">
        <span>🌍</span> TABLA DE GRUPOS
      </h2>
      
      {groups.length === 0 ? (
        <div className="text-center text-zinc-400 py-12 font-terminal text-lg">Cargando grupos...</div>
      ) : (
        <>
        <div className="font-terminal text-base text-zinc-400 mb-6 flex flex-wrap gap-x-6 gap-y-1">
          <span><span className="text-[#39ff14]">●</span> Clasifica directo</span>
          <span><span className="text-[#ffe600]">●</span> Posible mejor tercero</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {groups.map((g) => (
            <div key={g.group} className="border-2 border-zinc-700 bg-black/50 p-4">
              <h3 className="text-xl text-center text-white mb-4 border-b-2 border-zinc-800 pb-2">{g.group.replace('_', ' ')}</h3>
              
              <div className="w-full">
                <div className="flex font-terminal text-sm text-zinc-400 mb-2 px-2 gap-1">
                  <div className="w-8 text-center">#</div>
                  <div className="flex-1 pl-1">EQUIPO</div>
                  <div className="w-9 text-center">PTS</div>
                  <div className="w-8 text-center">PJ</div>
                  <div className="w-9 text-center">DIF</div>
                </div>

                <div className="space-y-2">
                  {g.table.map((row) => {
                    const owner = EQUIPO_A_PARTICIPANTE[normalizarTexto(row.team.name)] || 'LIBRE';
                    const flag = getFlagUrl(row.team.name);

                    return (
                      <div key={row.team.id} className="flex items-center gap-1 text-xs md:text-sm bg-zinc-900 p-2 border border-zinc-800 hover:border-[#ffe600] transition-colors cursor-pointer group" onClick={() => onTeamClick(row.team.name)}>
                        <div className="w-8 flex justify-center">
                          {/* verde: clasifica directo (1-2). amarillo: posible mejor tercero */}
                          <span className={row.position <= 2 ? 'text-[#39ff14]' : row.position === 3 ? 'text-[#ffe600]' : 'text-zinc-500'}>{row.position}</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-center overflow-hidden pr-2">
                           <div className="flex items-center gap-2">
                              {flag && <img src={flag} alt={row.team.name} className="w-6 h-4 object-cover pixel-border inline group-hover:scale-110 transition-transform" />}
                              <span className="truncate text-white line-clamp-1 group-hover:text-[#f97316] transition-colors">{row.team.name}</span>
                           </div>
                           <button
                              className="font-terminal text-sm text-[#00f3ff] mt-1 w-max px-1 hover:text-[#f97316] transition-colors"
                              onClick={(e) => { e.stopPropagation(); onParticipantClick(owner); }}
                           >[{owner.toUpperCase()}]</button>
                        </div>
                        <div className="w-9 text-center font-bold text-[#ffe600]">{row.points}</div>
                        <div className="w-8 text-center text-zinc-400">{row.playedGames}</div>
                        <div className="w-9 text-center text-zinc-400">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
};

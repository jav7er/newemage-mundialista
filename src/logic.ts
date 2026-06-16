import Papa from 'papaparse';
import { MatchData, TeamStats, ParticipantStats, GroupStanding, Scorer } from './types';
import { PARTICIPANTES, normalizarTexto, translateTeamName } from './data';

export const KNOCKOUT_STAGES = ['LAST_32', 'LAST_16', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];

export const isKnockoutStage = (etapa?: string) =>
  !!etapa && etapa !== 'GROUP_STAGE' && KNOCKOUT_STAGES.includes(etapa);

export const processRawMatches = (matches: MatchData[]) => {
  const teamStats: Record<string, TeamStats> = {};
  // Equipos eliminados: perdieron un partido de eliminación directa (incluye penales).
  const eliminados = new Set<string>();

  const getOrCreateTeam = (teamName: string) => {
    const norm = normalizarTexto(teamName);
    if (!teamStats[norm]) {
      teamStats[norm] = { pts: 0, gf: 0, gc: 0, pj: 0, pg: 0, pe: 0, pp: 0 };
    }
    return teamStats[norm];
  };

  matches.forEach(match => {
    if (match.Estado.toLowerCase() === 'terminado' || match.Estado.toLowerCase() === 'finished') {
      const t1 = normalizarTexto(match["Equipo 1"]);
      const t2 = normalizarTexto(match["Equipo 2"]);
      const g1 = parseInt(match["Goles 1"], 10);
      const g2 = parseInt(match["Goles 2"], 10);

      const st1 = getOrCreateTeam(t1);
      const st2 = getOrCreateTeam(t2);

      if (!isNaN(g1) && !isNaN(g2)) {
        st1.pj += 1;
        st2.pj += 1;
        st1.gf += g1;
        st1.gc += g2;
        st2.gf += g2;
        st2.gc += g1;

        if (isKnockoutStage(match.Etapa)) {
          // Eliminación directa: el ganador (incluso por penales) suma 3, no hay empates.
          const winner = match.Ganador === 'HOME' || (!match.Ganador && g1 > g2) ? st1
                       : match.Ganador === 'AWAY' || (!match.Ganador && g2 > g1) ? st2
                       : null;
          if (winner === st1) {
            st1.pts += 3; st1.pg += 1; st2.pp += 1;
            eliminados.add(t2);
          } else if (winner === st2) {
            st2.pts += 3; st2.pg += 1; st1.pp += 1;
            eliminados.add(t1);
          }
        } else if (g1 > g2) {
          st1.pts += 3;
          st1.pg += 1;
          st2.pp += 1;
        } else if (g2 > g1) {
          st2.pts += 3;
          st2.pg += 1;
          st1.pp += 1;
        } else {
          st1.pts += 1;
          st2.pts += 1;
          st1.pe += 1;
          st2.pe += 1;
        }
      }
    }
  });

  const partStats: ParticipantStats[] = Object.keys(PARTICIPANTES).map(nombre => {
    let puntosTotales = 0;
    let golesAFavor = 0;
    let golesEnContra = 0;
    let equiposVivos = 0;

    PARTICIPANTES[nombre as keyof typeof PARTICIPANTES].forEach(equipo => {
      const stats = getOrCreateTeam(equipo);
      puntosTotales += stats.pts;
      golesAFavor += stats.gf;
      golesEnContra += stats.gc;
      if (!eliminados.has(normalizarTexto(equipo))) equiposVivos += 1;
    });

    return { nombre, puntosTotales, golesAFavor, golesEnContra, equiposVivos, badges: [] };
  });

  partStats.sort((a, b) => b.puntosTotales - a.puntosTotales);

  // Asignar Badges (Nuevas Reglas)
  if (partStats.length > 0) {
    const maxPuntos = Math.max(...partStats.map(p => p.puntosTotales));
    if (maxPuntos > 0) {
      partStats.forEach(p => { if (p.puntosTotales === maxPuntos) p.badges.push('👑 Lider'); });
    }

    const maxGolesFav = Math.max(...partStats.map(p => p.golesAFavor));
    if (maxGolesFav > 0) {
      partStats.forEach(p => { if (p.golesAFavor === maxGolesFav) p.badges.push('⚽ Goleador'); });
    }

    const minGolesFav = Math.min(...partStats.map(p => p.golesAFavor));
    partStats.forEach(p => { if (p.golesAFavor === minGolesFav) p.badges.push('🥱 No da una'); });

    const minGolesContra = Math.min(...partStats.map(p => p.golesEnContra));
    partStats.forEach(p => { if (p.golesEnContra === minGolesContra) p.badges.push('🧱 Defensota'); });

    const maxGolesContra = Math.max(...partStats.map(p => p.golesEnContra));
    if (maxGolesContra > 0) {
      partStats.forEach(p => { if (p.golesEnContra === maxGolesContra) p.badges.push('🕳️ Mas Goleado'); });
    }
  }

  return { partStats, teamStats };
};

export const processCSVMatches = (csvText: string): MatchData[] => {
  const parsed = Papa.parse<MatchData>(csvText, { header: true, skipEmptyLines: true });
  return parsed.data.map(m => ({
    ...m,
    OriginalDate: m.Fecha ? new Date(m.Fecha) : undefined
  }));
};

const pad2 = (n: number) => String(n).padStart(2, '0');

// Fecha local YYYY-MM-DD (NO usar toISOString: regresa UTC y corre los
// partidos nocturnos al día siguiente).
export const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const toLocalTimeStr = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

// "2026-06-12" -> "Viernes 12 de Junio"
export const formatHumanDate = (fecha: string) => {
  const [y, m, d] = fecha.split('-').map(Number);
  if (!y || !m || !d) return fecha;
  const date = new Date(y, m - 1, d);
  const str = date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  return str.replace(/\p{L}+/gu, w => w === 'de' || w === 'del' ? w : w[0].toUpperCase() + w.slice(1));
};

export const processApiMatches = (apiData: any): MatchData[] => {
  if (!apiData || !apiData.matches) return [];

  return apiData.matches.map((apiMatch: any) => {
    const home = apiMatch.homeTeam?.name || '';
    const away = apiMatch.awayTeam?.name || '';

    const gs1 = apiMatch.score?.fullTime?.home ?? apiMatch.score?.regularTime?.home;
    const gs2 = apiMatch.score?.fullTime?.away ?? apiMatch.score?.regularTime?.away;

    const d = apiMatch.utcDate ? new Date(apiMatch.utcDate) : undefined;
    const winner = apiMatch.score?.winner; // HOME_TEAM | AWAY_TEAM | DRAW (cubre penales)

    return {
      Fecha: d ? toLocalDateStr(d) : '',
      Hora: d ? toLocalTimeStr(d) : '',
      "Equipo 1": translateTeamName(home),
      "Goles 1": gs1 !== null && gs1 !== undefined ? String(gs1) : '-',
      "Equipo 2": translateTeamName(away),
      "Goles 2": gs2 !== null && gs2 !== undefined ? String(gs2) : '-',
      Estado: apiMatch.status === 'FINISHED' ? 'Terminado' : (apiMatch.status === 'IN_PLAY' || apiMatch.status === 'PAUSED' ? 'En Juego' : 'Pendiente'),
      Etapa: apiMatch.stage || 'GROUP_STAGE',
      Ganador: winner === 'HOME_TEAM' ? 'HOME' : winner === 'AWAY_TEAM' ? 'AWAY' : winner === 'DRAW' ? 'DRAW' : null,
      OriginalDate: d
    };
  });
};

const TTL_MS = 60 * 1000; // 1 minuto (nginx cachea server-side; upstream recibe máx. 3 req/min)

export const fetchWithCache = async (url: string) => {
  try {
    const cached = localStorage.getItem(url);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < TTL_MS) {
        return data; // Return cached fresh
      }
    }
  } catch (e) {
    // disregard parse errors
  }

  // La API key se inyecta server-side (proxy de Vite / nginx), nunca en el cliente.
  const res = await fetch(url);

  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  
  const data = await res.json();
  localStorage.setItem(url, JSON.stringify({ data, timestamp: Date.now() }));
  return data;
};

export const fetchApiStandings = async () => {
  const data = await fetchWithCache('/api/wc/competitions/WC/standings');
  if (!data?.standings) return [];
  
  return data.standings.filter((s: any) => s.type === 'TOTAL').map((s: any) => {
    return {
      group: s.group,
      table: s.table.map((row: any) => ({
        position: row.position,
        team: { id: row.team.id, name: translateTeamName(row.team.name) },
        playedGames: row.playedGames,
        won: row.won,
        draw: row.draw,
        lost: row.lost,
        points: row.points,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference
      }))
    };
  });
};

export const getFallbackStandings = (teamStats: Record<string, TeamStats>): GroupStanding[] => {
  const groups: GroupStanding[] = [];
  Object.entries(PARTICIPANTES).forEach(([owner, teams]) => {
     const table = teams.map((t) => {
        const stats = teamStats[normalizarTexto(t)] || { pts: 0, gf: 0, gc: 0, pj: 0, pg: 0, pe: 0, pp: 0 };
        return {
           position: 0,
           team: { id: Math.random(), name: t },
           playedGames: stats.pj,
           won: stats.pg,
           draw: stats.pe,
           lost: stats.pp,
           points: stats.pts,
           goalsFor: stats.gf,
           goalsAgainst: stats.gc,
           goalDifference: stats.gf - stats.gc
        };
     }).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
     
     table.forEach((row, idx) => row.position = idx + 1);

     groups.push({
        group: `GRUPO ${owner.toUpperCase()}`,
        table
     });
  });
  return groups;
};

export const getFallbackScorers = (teamStats: Record<string, TeamStats>): Scorer[] => {
  const scorers: Scorer[] = [];
  Object.entries(teamStats).forEach(([normName, stats]) => {
     if (stats.gf > 0) {
        // Encontraremos el nombre original para mostrar
        const originalName = Object.values(PARTICIPANTES).flat().find(t => normalizarTexto(t) === normName) || normName.toUpperCase();
        scorers.push({
           player: { id: Math.random(), name: `Goleador (${originalName})` },
           team: { id: 0, name: originalName },
           goals: stats.gf,
           assists: Math.floor(stats.gf / 2),
           penalties: 0
        });
     }
  });
  return scorers.sort((a, b) => b.goals - a.goals).slice(0, 15);
};

export const fetchApiScorers = async () => {
  const data = await fetchWithCache('/api/wc/competitions/WC/scorers');
  if (!data?.scorers) return [];
  
  return data.scorers.map((s: any) => ({
    player: { id: s.player.id, name: s.player.name },
    team: { id: s.team.id, name: translateTeamName(s.team.name) },
    goals: s.goals,
    assists: s.assists,
    penalties: s.penalties
  }));
};

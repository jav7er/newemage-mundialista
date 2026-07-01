import Papa from 'papaparse';
import { MatchData, TeamStats, ParticipantStats, GroupStanding, Scorer, BracketRound, TeamAlive, PronosticoStats, PronosticoTeam } from './types';
import { PARTICIPANTES, normalizarTexto, translateTeamName, getFifaRank } from './data';

export const KNOCKOUT_STAGES = ['LAST_32', 'LAST_16', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];

export const isKnockoutStage = (etapa?: string) =>
  !!etapa && etapa !== 'GROUP_STAGE' && KNOCKOUT_STAGES.includes(etapa);

// Orden y etiquetas de la eliminatoria del Mundial 2026 (48 equipos).
// aliases cubre las variantes que puede mandar la API de football-data.
const KNOCKOUT_ROUNDS: { stage: string; label: string; expectedCount: number; aliases: string[] }[] = [
  { stage: 'LAST_32', label: '16AVOS', expectedCount: 16, aliases: ['LAST_32'] },
  { stage: 'LAST_16', label: 'OCTAVOS', expectedCount: 8, aliases: ['LAST_16', 'ROUND_OF_16'] },
  { stage: 'QUARTER_FINALS', label: 'CUARTOS', expectedCount: 4, aliases: ['QUARTER_FINALS', 'QUARTER_FINAL'] },
  { stage: 'SEMI_FINALS', label: 'SEMIS', expectedCount: 2, aliases: ['SEMI_FINALS', 'SEMI_FINAL'] },
  { stage: 'THIRD_PLACE', label: '3ER LUGAR', expectedCount: 1, aliases: ['THIRD_PLACE', 'THIRD_PLACE_FINAL'] },
  { stage: 'FINAL', label: 'FINAL', expectedCount: 1, aliases: ['FINAL'] },
];

const isMatchFinished = (m: MatchData) =>
  m.Estado.toLowerCase() === 'terminado' || m.Estado.toLowerCase() === 'finished';

// Nombre del equipo ganador de un partido terminado (soporta penales vía Ganador).
const getWinnerName = (m: MatchData): string | null => {
  if (!isMatchFinished(m)) return null;
  if (m.Ganador === 'HOME') return m["Equipo 1"];
  if (m.Ganador === 'AWAY') return m["Equipo 2"];
  const g1 = parseInt(m["Goles 1"], 10);
  const g2 = parseInt(m["Goles 2"], 10);
  if (isNaN(g1) || isNaN(g2)) return null;
  if (g1 > g2) return m["Equipo 1"];
  if (g2 > g1) return m["Equipo 2"];
  return null;
};

// Reordena los partidos de "current" (ronda anterior) para que cada pareja
// que alimenta el mismo partido de "next" (ronda siguiente) quede contigua
// y en el mismo orden relativo, replicando la estructura real del árbol
// (no solo el orden cronológico, que puede desalinear los cruces visuales).
// Además, si "next" todavía no tiene rival definido para ninguno de los dos
// lados, se le asigna al par de partidos pendientes que le corresponden por
// posición y, si alguno de ellos ya terminó, se adelanta su ganador para que
// se vea avanzando en el bracket sin esperar a que la API confirme el cruce
// completo.
const alignToNextRound = (current: MatchData[], next: MatchData[]): MatchData[] => {
  const remaining = [...current];
  const ordered: MatchData[] = [];

  const takeFeederByWinner = (teamName: string | undefined): MatchData | null => {
    if (!teamName) return null;
    const idx = remaining.findIndex(m => {
      const w = getWinnerName(m);
      return !!w && normalizarTexto(w) === normalizarTexto(teamName);
    });
    return idx === -1 ? null : remaining.splice(idx, 1)[0];
  };

  next.forEach((p, idx) => {
    const home = p["Equipo 1"];
    const away = p["Equipo 2"];

    if (home || away) {
      // Al menos un lado ya está definido: ubicamos sus dos alimentadores.
      const f1 = takeFeederByWinner(home);
      const f2 = takeFeederByWinner(away);
      if (f1) ordered.push(f1);
      if (f2) ordered.push(f2);
      return;
    }

    // Ambos lados indefinidos todavía: tomamos los siguientes dos partidos
    // pendientes (en orden) como sus probables alimentadores. Si alguno ya
    // terminó, mostramos su ganador de una vez (sin mutar el partido
    // original: se reemplaza por una copia local de esta ronda).
    const f1 = remaining.shift();
    const f2 = remaining.shift();
    const w1 = f1 ? getWinnerName(f1) : null;
    const w2 = f2 ? getWinnerName(f2) : null;
    if (w1 || w2) {
      next[idx] = { ...p, "Equipo 1": w1 ?? p["Equipo 1"], "Equipo 2": w2 ?? p["Equipo 2"] };
    }
    if (f1) ordered.push(f1);
    if (f2) ordered.push(f2);
  });

  ordered.push(...remaining);
  return ordered;
};

// Arma el bracket completo desde los partidos de eliminatoria de la API.
// Siempre devuelve las rondas principales (aunque estén vacías = "POR DEFINIR")
// para que se vea la estructura del árbol. La ronda de 3er lugar solo aparece
// cuando ya hay partido programado.
export const buildBracket = (matches: MatchData[]): BracketRound[] => {
  const rounds = KNOCKOUT_ROUNDS.map(r => ({
    stage: r.stage,
    label: r.label,
    expectedCount: r.expectedCount,
    matches: matches
      .filter(m => m.Etapa && r.aliases.includes(m.Etapa))
      .sort((a, b) => (a.OriginalDate?.getTime() ?? 0) - (b.OriginalDate?.getTime() ?? 0)),
  }));

  // Alinea cada ronda con la siguiente (de la primera a la última) para que
  // el bracket refleje quién enfrenta a quién en la práctica.
  const mainRounds = rounds.filter(r => r.stage !== 'THIRD_PLACE');
  for (let i = 0; i < mainRounds.length - 1; i++) {
    mainRounds[i].matches = alignToNextRound(mainRounds[i].matches, mainRounds[i + 1].matches);
  }

  return rounds.filter(r => r.stage !== 'THIRD_PLACE' || r.matches.length > 0);
};

// ¿Ya empezó la fase de eliminación? (hay al menos un partido de knockout)
export const hayEliminatoria = (matches: MatchData[]) =>
  matches.some(m => isKnockoutStage(m.Etapa));

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

  // Además de las eliminaciones directas en llaves (arriba), si el bracket
  // de eliminación ya arrancó (hay equipos reales asignados a Dieciseisavos)
  // cualquier equipo que jugó fase de grupos pero no aparece en ninguna
  // llave quedó fuera desde grupos: no debe seguir contando como "vivo" en
  // High Scores ni en el cálculo de probabilidades.
  const equiposEnLlaves = new Set<string>();
  matches.forEach(match => {
    if (isKnockoutStage(match.Etapa)) {
      if (match["Equipo 1"]) equiposEnLlaves.add(normalizarTexto(match["Equipo 1"]));
      if (match["Equipo 2"]) equiposEnLlaves.add(normalizarTexto(match["Equipo 2"]));
    }
  });
  if (equiposEnLlaves.size > 0) {
    Object.keys(teamStats).forEach(norm => {
      if (!equiposEnLlaves.has(norm)) eliminados.add(norm);
    });
  }

  const partStats: ParticipantStats[] = Object.keys(PARTICIPANTES).map(nombre => {
    let puntosTotales = 0;
    let golesAFavor = 0;
    let golesEnContra = 0;
    let equiposVivos = 0;
    const equipos: TeamAlive[] = [];

    PARTICIPANTES[nombre as keyof typeof PARTICIPANTES].forEach(equipo => {
      const stats = getOrCreateTeam(equipo);
      puntosTotales += stats.pts;
      golesAFavor += stats.gf;
      golesEnContra += stats.gc;
      const vivo = !eliminados.has(normalizarTexto(equipo));
      if (vivo) equiposVivos += 1;
      equipos.push({ nombre: equipo, vivo });
    });

    // Equipos vivos primero para que el panel los muestre arriba
    equipos.sort((a, b) => Number(b.vivo) - Number(a.vivo));

    return { nombre, puntosTotales, golesAFavor, golesEnContra, equiposVivos, equipos, badges: [] };
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

  return { partStats, teamStats, eliminados };
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

// ─── PRONÓSTICO ──────────────────────────────────────────────────────────────
// Calcula la "posibilidad de ganar la quiniela" de cada participante.
// Combina tres factores:
//   1. Fuerza FIFA (60 %): promedio de ranking FIFA de los equipos vivos (invertido).
//   2. Rendimiento en eliminatoria (30 %): puntos + goles en partidos knockout.
//   3. Cobertura (10 %): fracción de equipos aún vivos.
export const calcularPronosticos = (matches: MatchData[], eliminados: Set<string>): PronosticoStats[] => {
  // Partidos de eliminatoria terminados
  const knockoutFinished = matches.filter(
    m => isKnockoutStage(m.Etapa) && (m.Estado.toLowerCase() === 'terminado' || m.Estado.toLowerCase() === 'finished')
  );

  // Próximo rival en el bracket para cada equipo (primer partido pendiente/en juego donde aparece)
  const knockoutPending = matches.filter(
    m => isKnockoutStage(m.Etapa) && m.Estado.toLowerCase() !== 'terminado' && m.Estado.toLowerCase() !== 'finished'
  );
  const proximoRivalMap: Record<string, string> = {};
  knockoutPending.forEach(m => {
    const t1 = normalizarTexto(m["Equipo 1"]);
    const t2 = normalizarTexto(m["Equipo 2"]);
    if (!proximoRivalMap[t1]) proximoRivalMap[t1] = m["Equipo 2"];
    if (!proximoRivalMap[t2]) proximoRivalMap[t2] = m["Equipo 1"];
  });

  // Stats knockout por equipo
  const knockoutStats: Record<string, { pts: number; gf: number; gc: number }> = {};
  knockoutFinished.forEach(m => {
    const t1 = normalizarTexto(m["Equipo 1"]);
    const t2 = normalizarTexto(m["Equipo 2"]);
    const g1 = parseInt(m["Goles 1"], 10);
    const g2 = parseInt(m["Goles 2"], 10);
    if (isNaN(g1) || isNaN(g2)) return;

    if (!knockoutStats[t1]) knockoutStats[t1] = { pts: 0, gf: 0, gc: 0 };
    if (!knockoutStats[t2]) knockoutStats[t2] = { pts: 0, gf: 0, gc: 0 };

    knockoutStats[t1].gf += g1;
    knockoutStats[t1].gc += g2;
    knockoutStats[t2].gf += g2;
    knockoutStats[t2].gc += g1;

    const winner = m.Ganador === 'HOME' ? t1 : m.Ganador === 'AWAY' ? t2
      : g1 > g2 ? t1 : g2 > g1 ? t2 : null;
    if (winner) knockoutStats[winner].pts += 3;
  });

  const raw = Object.entries(PARTICIPANTES).map(([nombre, equipos]) => {
    const teams: PronosticoTeam[] = equipos.map(eq => {
      const norm = normalizarTexto(eq);
      const vivo = !eliminados.has(norm);
      const ks = knockoutStats[norm] ?? { pts: 0, gf: 0, gc: 0 };
      return {
        nombre: eq,
        fifaRank: getFifaRank(eq),
        vivo,
        knockoutPts: ks.pts,
        knockoutGf: ks.gf,
        knockoutGc: ks.gc,
        proximoRival: vivo ? (proximoRivalMap[norm] ?? null) : null,
      };
    });

    const vivos = teams.filter(t => t.vivo);
    const equiposVivos = vivos.length;
    const mejorEquipo = vivos.sort((a, b) => a.fifaRank - b.fifaRank)[0]?.nombre ?? equipos[0];

    // 1. FIFA: promedio de ranking de equipos vivos (o todos si ninguno vivo), invertido
    //    Escala: rank 1 → 99 pts, rank 48 → 52 pts, rank 99 → 1 pt
    const rankSource = vivos.length > 0 ? vivos : teams;
    const avgRank = rankSource.reduce((s, t) => s + t.fifaRank, 0) / rankSource.length;
    const rawFifa = Math.max(0, 100 - avgRank);

    // 2. Torneo: puntos + diferencia de goles en eliminatoria de los equipos vivos
    const knockPts = vivos.reduce((s, t) => s + t.knockoutPts, 0);
    const knockGd = vivos.reduce((s, t) => s + (t.knockoutGf - t.knockoutGc), 0);
    const rawTorneo = knockPts * 3 + Math.max(0, knockGd) * 0.5;

    // 3. Cobertura
    const rawVivos = (equiposVivos / 8) * 100;

    return { nombre, rawFifa, rawTorneo, rawVivos, teams, mejorEquipo, equiposVivos };
  });

  // Normalizar cada componente al rango del grupo (max=100)
  const maxFifa   = Math.max(...raw.map(r => r.rawFifa), 1);
  const maxTorneo = Math.max(...raw.map(r => r.rawTorneo), 1);

  const withScores = raw.map(r => {
    const scoreFifa   = (r.rawFifa / maxFifa) * 100;
    const scoreTorneo = (r.rawTorneo / maxTorneo) * 100;
    const scoreVivos  = r.rawVivos;
    const scoreTotal  = scoreFifa * 0.60 + scoreTorneo * 0.30 + scoreVivos * 0.10;
    return {
      nombre: r.nombre,
      scoreTotal,
      scoreFifa,
      scoreTorneo,
      scoreVivos,
      equipos: r.teams,
      mejorEquipo: r.mejorEquipo,
      equiposVivos: r.equiposVivos,
    } as PronosticoStats;
  });

  return withScores.sort((a, b) => b.scoreTotal - a.scoreTotal);
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

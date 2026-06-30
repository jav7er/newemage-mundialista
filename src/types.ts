export interface MatchData {
  Fecha: string; // YYYY-MM-DD en hora local del visitante
  Hora?: string; // HH:mm en hora local del visitante
  "Equipo 1": string;
  "Goles 1": string;
  "Equipo 2": string;
  "Goles 2": string;
  Estado: string;
  Etapa?: string; // GROUP_STAGE, LAST_32, LAST_16, QUARTER_FINALS, SEMI_FINALS, FINAL...
  Ganador?: 'HOME' | 'AWAY' | 'DRAW' | null; // incluye definición por penales
  OriginalDate?: Date;
}

export interface TeamStats {
  pts: number;
  gf: number;
  gc: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
}

export interface TeamAlive {
  nombre: string;
  vivo: boolean;
}

export interface ParticipantStats {
  nombre: string;
  puntosTotales: number;
  golesAFavor: number;
  golesEnContra: number;
  equiposVivos: number;
  equipos: TeamAlive[]; // los 8 equipos del participante con su estado vivo/eliminado
  badges: string[];
}

export interface BracketRound {
  stage: string;
  label: string;
  expectedCount: number; // cuántos partidos tiene la ronda cuando está completa
  matches: MatchData[];
}

export interface PronosticoTeam {
  nombre: string;
  fifaRank: number;
  vivo: boolean;
  knockoutPts: number; // puntos sumados en eliminatoria
  knockoutGf: number;
  knockoutGc: number;
  proximoRival: string | null; // siguiente rival en el bracket (null si ya no hay o eliminado)
}

export interface PronosticoStats {
  nombre: string;
  scoreTotal: number;    // 0-100 normalizado
  scoreFifa: number;     // componente ranking FIFA (0-100)
  scoreTorneo: number;   // componente rendimiento en torneo (0-100)
  scoreVivos: number;    // componente equipos vivos (0-100)
  equipos: PronosticoTeam[];
  mejorEquipo: string;   // equipo con mejor FIFA rank vivo
  equiposVivos: number;
}

export interface GroupItem {
  id: number;
  name: string;
}

export interface StandingTeam {
  position: number;
  team: GroupItem;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface GroupStanding {
  group: string;
  table: StandingTeam[];
}

export interface Scorer {
  player: { id: number; name: string };
  team: { id: number; name: string };
  goals: number;
  assists: number;
  penalties: number;
}

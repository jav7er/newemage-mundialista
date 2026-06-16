import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MatchData, ParticipantStats, GroupStanding, Scorer } from './types';
import { processCSVMatches, processApiMatches, processRawMatches, fetchWithCache, fetchApiStandings, fetchApiScorers, getFallbackStandings, getFallbackScorers, toLocalDateStr } from './logic';
import { EQUIPO_A_PARTICIPANTE, normalizarTexto } from './data';
import { DashboardView } from './components/DashboardView';
import { MatchesView } from './components/MatchesView';
import { GroupsView } from './components/GroupsView';
import { ScorersView } from './components/ScorersView';
import { ParticipantModal } from './components/ParticipantModal';
import { TeamModal } from './components/TeamModal';
import { InfoModal } from './components/InfoModal';
import { Ticker } from './components/Ticker';
import { fireConfetti } from './confetti';
import { playCoin, playGoal, playPowerUp, soundEnabled, setSoundEnabled } from './sounds';
import { shareLeaderboard } from './share';

type ViewMode = 'DASHBOARD' | 'MATCHES' | 'GROUPS' | 'SCORERS';
const VIEWS: ViewMode[] = ['DASHBOARD', 'MATCHES', 'GROUPS', 'SCORERS'];

interface GoalEvent {
  participant: string;
  team: string;
  score: string;
}

const isTvMode = new URLSearchParams(window.location.search).has('tv');

export default function App() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [leaderboard, setLeaderboard] = useState<ParticipantStats[]>([]);
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [scorers, setScorers] = useState<Scorer[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'API' | 'CSV'>('API');
  const [activeView, setActiveView] = useState<ViewMode>('DASHBOARD');

  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantStats | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const [soundOn, setSoundOn] = useState(soundEnabled());
  const [goalEvent, setGoalEvent] = useState<GoalEvent | null>(null);
  const [now, setNow] = useState(Date.now());

  // Snapshot del marcador anterior para detectar goles entre refrescos
  const prevScores = useRef<Record<string, number> | null>(null);
  const prevLeader = useRef<string | null>(null);

  const detectGoals = useCallback((newMatches: MatchData[]) => {
    const current: Record<string, number> = {};
    const events: GoalEvent[] = [];

    newMatches.forEach(m => {
      const g1 = parseInt(m["Goles 1"], 10);
      const g2 = parseInt(m["Goles 2"], 10);
      if (isNaN(g1) || isNaN(g2)) return;
      const key = `${m.Fecha}|${m["Equipo 1"]}|${m["Equipo 2"]}`;
      current[key] = g1 + g2;

      if (prevScores.current && key in prevScores.current && current[key] > prevScores.current[key]) {
        // Hubo gol: celebramos al dueño del equipo que (probablemente) anotó.
        // Sin data por-evento solo sabemos el total; celebramos ambos lados con dueño.
        const score = `${m["Equipo 1"]} ${g1}-${g2} ${m["Equipo 2"]}`;
        [m["Equipo 1"], m["Equipo 2"]].forEach(team => {
          const owner = EQUIPO_A_PARTICIPANTE[normalizarTexto(team)];
          if (owner && events.length === 0) events.push({ participant: owner, team, score });
        });
      }
    });

    prevScores.current = current;
    if (events.length > 0) {
      setGoalEvent(events[0]);
      fireConfetti();
      playGoal();
      setTimeout(() => setGoalEvent(null), 7000);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      let rawDataMatches: MatchData[] = [];
      let source: 'API' | 'CSV' = 'API';

      try {
        const data = await fetchWithCache('/api/wc/competitions/WC/matches');
        rawDataMatches = processApiMatches(data);
      } catch (err) {
        console.warn("API de football-data falló. Cayendo a CSV local.");
        source = 'CSV';

        try {
          const resCsv = await fetch('/matches.csv?t=' + new Date().getTime());
          if (!resCsv.ok) throw new Error('No se pudo cargar matches.csv local');
          const text = await resCsv.text();
          rawDataMatches = processCSVMatches(text);
        } catch (csvErr: any) {
          setError('Fallo total de conexión a datos. Revisar CSV u orígenes de API.');
          setLoading(false);
          return;
        }
      }

      setDataSource(source);
      setMatches(rawDataMatches);
      detectGoals(rawDataMatches);

      const { partStats, teamStats } = processRawMatches(rawDataMatches);
      setLeaderboard(partStats);

      // Power-up cuando cambia el líder (no en la carga inicial)
      const leader = partStats[0]?.nombre ?? null;
      if (prevLeader.current && leader && leader !== prevLeader.current) playPowerUp();
      prevLeader.current = leader;

      if (source === 'CSV') {
         setStandings(getFallbackStandings(teamStats));
         setScorers(getFallbackScorers(teamStats));
      } else {
         fetchApiStandings().then(s => {
            if (s.length === 0) setStandings(getFallbackStandings(teamStats));
            else setStandings(s);
         }).catch(() => setStandings(getFallbackStandings(teamStats)));

         fetchApiScorers().then(s => {
            if (s.length === 0) setScorers(getFallbackScorers(teamStats));
            else setScorers(s);
         }).catch(() => setScorers(getFallbackScorers(teamStats)));
      }

      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 60 * 1000); // 1 minuto
    return () => clearInterval(interval);
  }, [detectGoals]);

  // Reloj para el countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Modo TV: rota las vistas cada 30s (?tv=1)
  useEffect(() => {
    if (!isTvMode) return;
    const t = setInterval(() => {
      setActiveView(v => VIEWS[(VIEWS.indexOf(v) + 1) % VIEWS.length]);
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const changeView = (mode: ViewMode) => {
    if (mode !== activeView) playCoin();
    setActiveView(mode);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playCoin();
  };

  const getTodayMatches = () => {
    const todayStr = toLocalDateStr(new Date());
    let todays = matches.filter(m => m.Fecha === todayStr);

    if (todays.length === 0) {
      todays = matches.filter(m => m.Estado === 'Pendiente' || m.Estado === 'SCHEDULED');
      if (todays.length === 0) {
        todays = [...matches].reverse();
      }
    }
    return todays.slice(0, 4);
  };

  const featured = getTodayMatches();

  // Próximo partido para el countdown
  const nextMatch = matches
    .filter(m => m.Estado === 'Pendiente' && m.OriginalDate && m.OriginalDate.getTime() > now)
    .sort((a, b) => a.OriginalDate!.getTime() - b.OriginalDate!.getTime())[0];

  const countdown = (() => {
    if (!nextMatch?.OriginalDate) return null;
    const diff = Math.max(0, nextMatch.OriginalDate.getTime() - now);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const p = (n: number) => String(n).padStart(2, '0');
    return h >= 24 ? `${Math.floor(h / 24)}D ${p(h % 24)}H` : `${p(h)}:${p(m)}:${p(s)}`;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-[#39ff14] flex flex-col items-center justify-center p-8 font-pixel">
        <h1 className="text-xl md:text-3xl mb-8 animate-blink text-center leading-relaxed">INICIANDO CONSOLA...</h1>
        <div className="w-64 h-4 border-2 border-[#39ff14] p-1">
          <motion.div
            className="h-full bg-[#39ff14]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </div>
    );
  }

  const handleParticipantClick = (name: string) => {
    const p = leaderboard.find(l => l.nombre.toLowerCase() === name.toLowerCase());
    if (p) setSelectedParticipant(p);
  };

  const renderView = () => {
    switch(activeView) {
      case 'DASHBOARD': return <DashboardView featured={featured} leaderboard={leaderboard} matches={matches} onParticipantClick={handleParticipantClick} onTeamClick={setSelectedTeam} onShare={() => shareLeaderboard(leaderboard)} />;
      case 'MATCHES': return <MatchesView matches={matches} onParticipantClick={handleParticipantClick} onTeamClick={setSelectedTeam} />;
      case 'GROUPS': return <GroupsView groups={standings} onParticipantClick={handleParticipantClick} onTeamClick={setSelectedTeam} />;
      case 'SCORERS': return <ScorersView scorers={scorers} onParticipantClick={handleParticipantClick} onTeamClick={setSelectedTeam} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 overflow-x-hidden relative font-pixel">
      <div className="scanlines"></div>

      {/* BANNER DE GOL */}
      <AnimatePresence>
        {goalEvent && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-[#39ff14] text-black text-center py-3 px-4 pixel-border-green"
          >
            <span className="text-sm md:text-lg tracking-widest animate-blink">
              ⚽ ¡GOOOL DE {goalEvent.participant.toUpperCase()}! ({goalEvent.team})
            </span>
            <div className="font-terminal text-base md:text-lg mt-1">{goalEvent.score}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto relative z-10">

        <header className="mb-8 text-center">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 mb-4">
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="flex-shrink-0 cursor-pointer"
              onClick={() => changeView('DASHBOARD')}
            >
              <svg viewBox="0 0 100 100" className="w-16 h-16 md:w-20 md:h-20 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]">
                <circle cx="50" cy="50" r="46" fill="#f97316" stroke="white" strokeWidth="6" />
                <g fill="white">
                  <rect x="38" y="30" width="24" height="8" />
                  <rect x="30" y="38" width="8" height="8" />
                  <rect x="62" y="38" width="8" height="8" />
                  <rect x="30" y="46" width="40" height="8" />
                  <rect x="30" y="54" width="8" height="8" />
                  <rect x="38" y="62" width="24" height="8" />
                </g>
              </svg>
            </motion.div>

            <motion.h1
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-2xl sm:text-3xl lg:text-5xl text-[#f97316] tracking-widest pixel-border-orange inline-block p-3 md:p-4 bg-black/80 m-0"
            >
              NEW EMAGE
            </motion.h1>
          </div>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg sm:text-xl md:text-3xl text-white mt-4 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
          >
            MUNDIAL 2026
          </motion.h2>

          <div className="mt-4 flex justify-center items-center gap-2 flex-wrap">
            <div className={`text-[10px] px-2 py-1 inline-block ${dataSource === 'API' ? 'bg-[#ff00ff] text-white pixel-border-magenta' : 'bg-zinc-800 text-zinc-400 pixel-border'}`}>
              SYS COMM: {dataSource === 'API' ? 'LIVE API ONLINE' : 'OFFLINE CSV MODE'}
            </div>
            {isTvMode && (
              <div className="text-[10px] px-2 py-1 inline-block bg-[#00f3ff] text-black pixel-border-cyan">📺 TV MODE</div>
            )}
            <button
              onClick={toggleSound}
              aria-label={soundOn ? 'Silenciar sonidos' : 'Activar sonidos'}
              className="text-[10px] px-2 py-1 bg-black text-white border border-zinc-700 hover:border-[#39ff14] transition-colors"
            >
              {soundOn ? '🔊 SFX ON' : '🔇 SFX OFF'}
            </button>
            <button
              onClick={() => setShowInfo(true)}
              className="text-[10px] px-2 py-1 bg-black text-[#ffe600] border border-zinc-700 hover:border-[#ffe600] transition-colors"
            >
              [?] ¿CÓMO FUNCIONA?
            </button>
          </div>

          {nextMatch && countdown && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 inline-block bg-black border-2 border-[#00f3ff] px-4 py-2"
            >
              <span className="text-[10px] sm:text-xs text-[#00f3ff]">
                ⏰ PRÓXIMO: {nextMatch["Equipo 1"].toUpperCase()} VS {nextMatch["Equipo 2"].toUpperCase()}
                {nextMatch.Hora && <span className="text-zinc-400"> · {nextMatch.Hora} HRS</span>}
              </span>
              <span className="block sm:inline text-sm sm:text-base text-white sm:ml-3 mt-1 sm:mt-0 tracking-widest">{countdown}</span>
            </motion.div>
          )}
        </header>

        {/* TICKER DE RESULTADOS */}
        <Ticker matches={matches} leaderboard={leaderboard} />

        {/* NAVEGACION */}
        <nav className="flex flex-wrap justify-center gap-2 mb-8 bg-[#111] p-2 pixel-border">
          {VIEWS.map((mode) => (
            <button
               key={mode}
               onClick={() => changeView(mode)}
               className={`px-4 py-3 text-[10px] sm:text-xs md:text-sm tracking-widest transition-colors ${activeView === mode ? 'bg-[#f97316] text-white pixel-border-orange drop-shadow-[0_0_5px_#f97316]' : 'bg-black text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-500'}`}
            >
              [{mode}]
            </button>
          ))}
        </nav>

        {error && (
          <div className="bg-red-900 border border-red-500 text-white p-4 mb-8 pixel-border-red text-xs sm:text-sm">
            ERROR DEL SISTEMA: {error}
          </div>
        )}

        <motion.div
           key={activeView}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.3 }}
        >
          {renderView()}
        </motion.div>

        <footer className="mt-16 text-center border-t-2 border-zinc-900 pt-8 pb-12">
           <p className="text-[10px] sm:text-xs text-zinc-500 mb-3">© 2026 NEW EMAGE. SYSTEM OPERATIONAL.</p>
           <a
             href="https://newemage.com.mx?utm_source=mundial&utm_medium=footer"
             target="_blank"
             rel="noopener noreferrer"
             className="inline-block text-[10px] sm:text-xs text-[#f97316] border-2 border-[#f97316] px-4 py-3 hover:bg-[#f97316] hover:text-black transition-colors tracking-widest"
           >
             HECHO CON 🧡 POR NEW EMAGE → ¿QUIERES ALGO ASÍ PARA TU MARCA?
           </a>
        </footer>

      </div>

      <AnimatePresence>
        {selectedParticipant && (
           <ParticipantModal
             participant={selectedParticipant}
             onClose={() => setSelectedParticipant(null)}
             matches={matches}
           />
        )}
        {selectedTeam && (
           <TeamModal
             teamName={selectedTeam}
             onClose={() => setSelectedTeam(null)}
             matches={matches}
             standings={standings}
             scorers={scorers}
           />
        )}
        {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
      </AnimatePresence>
    </div>
  );
}

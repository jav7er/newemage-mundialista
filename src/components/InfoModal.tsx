import { useEffect } from 'react';
import { motion } from 'motion/react';
import { PARTICIPANTES, getFlagUrl } from '../data';

interface Props {
  onClose: () => void;
}

export const InfoModal = ({ onClose }: Props) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#111] border-2 border-[#ffe600] p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar relative"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Cómo funciona la quiniela"
      >
        <button onClick={onClose} aria-label="Cerrar" className="absolute top-3 right-3 text-zinc-400 hover:text-white text-2xl p-2 leading-none">✖</button>

        <h2 className="text-2xl text-[#ffe600] mb-6 tracking-widest">¿CÓMO FUNCIONA?</h2>

        <div className="font-terminal text-lg text-zinc-300 space-y-4 leading-relaxed">
          <p>
            En <span className="text-[#f97316]">NEW EMAGE</span> armamos una quiniela interna para
            vivir el Mundial 2026 con más emoción. Cada integrante del equipo "maneja" 8 selecciones
            que le tocaron al azar. 🎲
          </p>
          <p className="text-white">Las reglas son simples:</p>
          <ul className="space-y-2 list-none">
            <li><span className="text-[#39ff14]">▸</span> Victoria de tu selección: <span className="text-[#39ff14]">3 puntos</span></li>
            <li><span className="text-[#00f3ff]">▸</span> Empate en fase de grupos: <span className="text-[#00f3ff]">1 punto</span></li>
            <li><span className="text-[#ff00ff]">▸</span> En eliminación directa, ganar (aunque sea por penales) vale <span className="text-[#ff00ff]">3 puntos</span></li>
            <li><span className="text-[#ffe600]">▸</span> Gana quien acumule más puntos al final del torneo 🏆</li>
          </ul>
          <p>
            Los tags como <span className="text-[#39ff14]">[ROBERT]</span> junto a cada selección
            indican quién es su "manager". Haz click en cualquier equipo o participante para ver su detalle.
          </p>
        </div>

        <h3 className="text-lg text-[#00f3ff] mt-8 mb-4 border-b border-zinc-800 pb-2">LOS EQUIPOS DE CADA JUGADOR</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(PARTICIPANTES).map(([nombre, equipos]) => (
            <div key={nombre} className="bg-black border border-zinc-800 p-3">
              <div className="text-[#f97316] mb-2 tracking-widest">{nombre.toUpperCase()}</div>
              <div className="flex flex-wrap gap-2">
                {equipos.map(eq => {
                  const flag = getFlagUrl(eq);
                  return (
                    <span key={eq} className="font-terminal text-base text-zinc-300 inline-flex items-center gap-1 bg-zinc-900 px-2 py-1 border border-zinc-800">
                      {flag && <img src={flag} alt="" className="w-4 h-3 object-cover" />}
                      {eq}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="font-terminal text-base text-zinc-500 mt-6">
          * Esto es 100% por diversión: no hay dinero de por medio, solo el honor (y carrilla) de la oficina. 😄
        </p>
      </motion.div>
    </div>
  );
};

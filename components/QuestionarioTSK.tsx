"use client";

import { useState } from "react";
import { ClipboardList, Plus, X } from "lucide-react";
import { uid, type QuestionarioKinesiofobia } from "@/lib/store";

const DOMANDE: string[] = [
  "Ho paura di potermi fare del male se mi alleno",
  "Se cerco di superare la paura o il dolore, ci riesco",
  "Il mio corpo mi dice che ho qualcosa di seriamente sbagliato",
  "Il dolore non mi impedirebbe di fare attività sportiva o di allenarmi",
  "Le persone non considerano abbastanza serio il mio problema di salute",
  "Il mio infortunio ha messo in pericolo la mia salute fisica per il resto della vita",
  "Il dolore mi segnala sempre che ho danneggiato qualcosa nel mio corpo",
  "Il fatto che qualcosa mi faccia male non significa necessariamente che sia pericoloso",
  "Ho paura di potermi fare del male per sbaglio",
  "Il modo migliore per evitare che il mio dolore peggiori è fare attenzione e non fare movimenti non necessari",
  "Non avrei questo dolore se non ci fosse qualcosa di potenzialmente pericoloso nel mio corpo",
  "Anche se mi fa male, mi troverei meglio se fossi fisicamente attivo",
  "Il dolore mi avverte quando smettere di fare attività sportiva per non farmi del male",
  "Per qualcuno nella mia condizione, non è sicuro essere fisicamente attivo",
  "Non riesco a fare tutto quello che fanno le persone normali perché mi faccio del male troppo facilmente",
  "Nonostante il dolore continuo comunque a praticare attività sportiva",
  "Nessuno dovrebbe fare attività sportiva quando il dolore è presente",
];

// Items scored in reverse (1-based index)
const REVERSED = new Set([4, 8, 12, 16]);

function calcolaPunteggio(risposte: number[]): number {
  return risposte.reduce((sum, r, idx) => {
    return sum + (REVERSED.has(idx + 1) ? 5 - r : r);
  }, 0);
}

function interpreta(punteggio: number): { label: string; color: string; bg: string } {
  if (punteggio >= 45) return { label: "Alta kinesiofobia", color: "text-red-600", bg: "bg-red-50 border-red-200 text-red-700" };
  if (punteggio >= 38) return { label: "Kinesiofobia moderata", color: "text-orange-600", bg: "bg-orange-50 border-orange-200 text-orange-700" };
  return { label: "Bassa kinesiofobia", color: "text-green-600", bg: "bg-green-50 border-green-200 text-green-700" };
}

interface Props {
  questionari: QuestionarioKinesiofobia[];
  onSalva: (questionari: QuestionarioKinesiofobia[]) => Promise<void>;
}

export default function QuestionarioTSK({ questionari, onSalva }: Props) {
  const [mostraForm, setMostraForm] = useState(false);
  const [risposte, setRisposte] = useState<(number | null)[]>(Array(17).fill(null));
  const [salvando, setSalvando] = useState(false);

  const risposteComplete = risposte.every((r) => r !== null);
  const punteggioProvvisorio = risposteComplete ? calcolaPunteggio(risposte as number[]) : null;

  const handleSalva = async () => {
    if (!risposteComplete) return;
    setSalvando(true);
    const r = risposte as number[];
    const nuovo: QuestionarioKinesiofobia = {
      id: uid(),
      data: new Date().toISOString().slice(0, 10),
      risposte: r,
      punteggio: calcolaPunteggio(r),
    };
    await onSalva([...questionari, nuovo]);
    setMostraForm(false);
    setRisposte(Array(17).fill(null));
    setSalvando(false);
  };

  const elimina = async (id: string) => {
    if (!confirm("Eliminare questo questionario?")) return;
    await onSalva(questionari.filter((q) => q.id !== id));
  };

  const risposteDate = risposte.filter((r) => r !== null).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#C8102E]" />
          <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Tampa Scale – TSK‑17</p>
        </div>
        {!mostraForm && (
          <button
            onClick={() => setMostraForm(true)}
            className="flex items-center gap-1 text-xs text-[#C8102E] font-semibold hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nuovo
          </button>
        )}
      </div>

      {/* Storico risultati */}
      {!mostraForm && (
        <>
          {questionari.length === 0 ? (
            <p className="text-xs text-gray-400 italic mb-1">Nessun questionario compilato</p>
          ) : (
            <div className="space-y-2 mb-1">
              {[...questionari].reverse().map((q) => {
                const { bg } = interpreta(q.punteggio);
                const { label } = interpreta(q.punteggio);
                return (
                  <div key={q.id} className={`rounded-xl border p-3 ${bg}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold opacity-70">
                          {new Date(q.data + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                        <p className="text-2xl font-bold mt-0.5">
                          {q.punteggio}
                          <span className="text-sm font-normal opacity-60 ml-1">/ 68</span>
                        </p>
                        <p className="text-xs font-semibold mt-0.5">{label}</p>
                      </div>
                      <button onClick={() => elimina(q.id)} className="opacity-30 hover:opacity-70 transition-opacity mt-0.5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Form questionario */}
      {mostraForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-gray-500 leading-relaxed">
              Indica il tuo grado di accordo con ciascuna affermazione.<br />
              <span className="font-semibold">1</span> = Fortemente in disaccordo &nbsp;·&nbsp; <span className="font-semibold">4</span> = Fortemente d'accordo
            </p>
            <button
              onClick={() => { setMostraForm(false); setRisposte(Array(17).fill(null)); }}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Domande compilate</span>
              <span className="font-semibold">{risposteDate} / 17</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C8102E] rounded-full transition-all"
                style={{ width: `${(risposteDate / 17) * 100}%` }}
              />
            </div>
          </div>

          {/* Domande */}
          <div className="space-y-4">
            {DOMANDE.map((domanda, idx) => (
              <div key={idx}>
                <p className="text-xs text-gray-700 mb-2 leading-snug">
                  <span className="font-bold text-gray-400 mr-1">{idx + 1}.</span>
                  {domanda}
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((v) => (
                    <button
                      key={v}
                      onClick={() => setRisposte((prev) => { const n = [...prev]; n[idx] = v; return n; })}
                      className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                        risposte[idx] === v
                          ? "bg-[#C8102E] border-[#C8102E] text-white"
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Score preview + save */}
          <div className="pt-2 space-y-3">
            {punteggioProvvisorio !== null && (
              <div className={`rounded-xl border p-3 ${interpreta(punteggioProvvisorio).bg}`}>
                <p className="text-xs font-semibold opacity-70 mb-0.5">Punteggio</p>
                <p className="text-2xl font-bold">
                  {punteggioProvvisorio}
                  <span className="text-sm font-normal opacity-60 ml-1">/ 68</span>
                </p>
                <p className="text-xs font-semibold">{interpreta(punteggioProvvisorio).label}</p>
              </div>
            )}
            <button
              onClick={handleSalva}
              disabled={!risposteComplete || salvando}
              className="w-full bg-[#C8102E] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-800 disabled:opacity-40 transition-colors"
            >
              {salvando ? "Salvataggio…" : `Salva questionario${!risposteComplete ? ` (${17 - risposteDate} rimanenti)` : ""}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

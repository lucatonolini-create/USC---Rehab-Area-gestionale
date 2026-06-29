"use client";

import { useState } from "react";
import { ClipboardList, Plus, X, Link2 } from "lucide-react";
import { uid, type QuestionarioKinesiofobia } from "@/lib/store";

interface InfortunioOpzione {
  id: string;
  label: string;
}

const DOMANDE: { testo: string; categoria: "Emozioni" | "Fiducia" | "Rischio"; ancoraMin: string; ancoraMax: string; reversed: boolean }[] = [
  { testo: "Sei ansioso riguardo al tuo ritorno in campo?", categoria: "Emozioni", ancoraMin: "Per niente", ancoraMax: "Moltissimo", reversed: true },
  { testo: "Hai paura di farti nuovamente del male durante l'attività sportiva?", categoria: "Emozioni", ancoraMin: "Per niente", ancoraMax: "Moltissimo", reversed: true },
  { testo: "È frustrante dover essere ancora cauto nei movimenti sportivi?", categoria: "Emozioni", ancoraMin: "Per niente", ancoraMax: "Moltissimo", reversed: true },
  { testo: "Sei nervoso riguardo alla tua prestazione quando torni a competere?", categoria: "Emozioni", ancoraMin: "Per niente", ancoraMax: "Moltissimo", reversed: true },
  { testo: "Ti senti a disagio per le limitazioni che l'infortunio ha ancora imposto alla tua attività?", categoria: "Emozioni", ancoraMin: "Per niente", ancoraMax: "Moltissimo", reversed: true },
  { testo: "Sei fiducioso nella capacità della zona infortunata di reggere gli sforzi richiesti dallo sport ad alto livello?", categoria: "Fiducia", ancoraMin: "Per niente", ancoraMax: "Completamente", reversed: false },
  { testo: "Sei fiducioso nelle tue abilità tecniche e atletiche al livello pre-infortunio?", categoria: "Fiducia", ancoraMin: "Per niente", ancoraMax: "Completamente", reversed: false },
  { testo: "Sei fiducioso di poter eseguire movimenti esplosivi (sprint, salti, cambi di direzione) senza trattenerti?", categoria: "Fiducia", ancoraMin: "Per niente", ancoraMax: "Completamente", reversed: false },
  { testo: "Sei fiducioso di poter affrontare contrasti e duelli fisici senza preoccuparti per la zona infortunata?", categoria: "Fiducia", ancoraMin: "Per niente", ancoraMax: "Completamente", reversed: false },
  { testo: "Pensi di poterti fare nuovamente del male tornando a praticare sport al tuo livello?", categoria: "Rischio", ancoraMin: "Per niente", ancoraMax: "Moltissimo", reversed: true },
  { testo: "Pensi che la zona infortunata sia abbastanza solida per reggere le sollecitazioni dello sport d'élite?", categoria: "Rischio", ancoraMin: "Per niente", ancoraMax: "Completamente", reversed: false },
  { testo: "Pensi di essere fisicamente e mentalmente pronto per tornare a competere al massimo livello?", categoria: "Rischio", ancoraMin: "Per niente", ancoraMax: "Completamente", reversed: false },
];

function calcolaPunteggio(risposte: number[]): number {
  const tot = risposte.reduce((s, r, i) => s + (DOMANDE[i].reversed ? 10 - r : r), 0);
  return Math.round((tot / (DOMANDE.length * 10)) * 100);
}

function interpreta(p: number): { label: string; sub: string; bg: string } {
  if (p >= 75) return { label: "Alta prontezza psicologica", sub: "Pronto per il ritorno in campo", bg: "bg-green-50 border-green-200 text-green-700" };
  if (p >= 56) return { label: "Prontezza moderata", sub: "Valutare con attenzione prima del ritorno", bg: "bg-orange-50 border-orange-200 text-orange-700" };
  return { label: "Bassa prontezza psicologica", sub: "Ritorno in campo non raccomandato", bg: "bg-red-50 border-red-200 text-red-700" };
}

interface Props {
  questionari: QuestionarioKinesiofobia[];
  infortuni: InfortunioOpzione[];
  onSalva: (questionari: QuestionarioKinesiofobia[]) => Promise<void>;
}

export default function QuestionarioTSK({ questionari, infortuni, onSalva }: Props) {
  const [mostraForm, setMostraForm] = useState(false);
  const [infortunioSelId, setInfortunioSelId] = useState("");
  const [risposte, setRisposte] = useState<(number | null)[]>(Array(DOMANDE.length).fill(null));
  const [salvando, setSalvando] = useState(false);

  const risposteDate = risposte.filter((r) => r !== null).length;
  const complete = risposteDate === DOMANDE.length && infortunioSelId !== "";
  const punteggioPreview = risposteDate === DOMANDE.length ? calcolaPunteggio(risposte as number[]) : null;

  const infortunioLabel = infortuni.find((i) => i.id === infortunioSelId)?.label ?? "";

  const handleSalva = async () => {
    if (!complete) return;
    setSalvando(true);
    const r = risposte as number[];
    const nuovo: QuestionarioKinesiofobia = {
      id: uid(),
      data: new Date().toISOString().slice(0, 10),
      risposte: r,
      punteggio: calcolaPunteggio(r),
      infortunioId: infortunioSelId,
      infortunioLabel,
    };
    await onSalva([...questionari, nuovo]);
    setMostraForm(false);
    setInfortunioSelId("");
    setRisposte(Array(DOMANDE.length).fill(null));
    setSalvando(false);
  };

  const chiudiForm = () => {
    setMostraForm(false);
    setInfortunioSelId("");
    setRisposte(Array(DOMANDE.length).fill(null));
  };

  const elimina = async (id: string) => {
    if (!confirm("Eliminare questo questionario?")) return;
    await onSalva(questionari.filter((q) => q.id !== id));
  };

  const categorie = ["Emozioni", "Fiducia", "Rischio"] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#C8102E]" />
          <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">RTS Score – Ritorno in Campo</p>
        </div>
        {!mostraForm && (
          <button onClick={() => setMostraForm(true)}
            className="flex items-center gap-1 text-xs text-[#C8102E] font-semibold hover:bg-red-50 px-2 py-1 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuovo
          </button>
        )}
      </div>

      {/* Storico */}
      {!mostraForm && (
        <>
          {questionari.length === 0 ? (
            <p className="text-xs text-gray-400 italic mb-1">Nessuna valutazione compilata</p>
          ) : (
            <div className="space-y-2 mb-1">
              {[...questionari].reverse().map((q) => {
                const { label, sub, bg } = interpreta(q.punteggio);
                return (
                  <div key={q.id} className={`rounded-xl border p-3 ${bg}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold opacity-70">
                          {new Date(q.data + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                        {q.infortunioLabel && (
                          <div className="flex items-center gap-1 mt-0.5 mb-1">
                            <Link2 className="w-3 h-3 opacity-50 shrink-0" />
                            <p className="text-[11px] opacity-60 truncate">{q.infortunioLabel}</p>
                          </div>
                        )}
                        <p className="text-2xl font-bold">
                          {q.punteggio}
                          <span className="text-sm font-normal opacity-60 ml-1">/ 100</span>
                        </p>
                        <p className="text-xs font-semibold">{label}</p>
                        <p className="text-xs opacity-70 mt-0.5">{sub}</p>
                      </div>
                      <button onClick={() => elimina(q.id)} className="opacity-30 hover:opacity-70 transition-opacity ml-2 mt-0.5">
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

      {/* Form */}
      {mostraForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-gray-700">Valutazione psicologica al ritorno in campo</p>
              <p className="text-xs text-gray-400 mt-0.5">Scala 0–10 per ogni risposta</p>
            </div>
            <button onClick={chiudiForm} className="text-gray-400 hover:text-gray-600 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Injury selector */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">
              <Link2 className="w-3 h-3 inline mr-1 opacity-60" />
              Infortunio di riferimento *
            </p>
            {infortuni.length === 0 ? (
              <p className="text-xs text-gray-400 italic bg-white border border-gray-200 rounded-xl px-3 py-2">
                Nessun infortunio registrato da associare
              </p>
            ) : (
              <select
                value={infortunioSelId}
                onChange={(e) => setInfortunioSelId(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
              >
                <option value="">— Seleziona infortunio —</option>
                {infortuni.map((inf) => (
                  <option key={inf.id} value={inf.id}>{inf.label}</option>
                ))}
              </select>
            )}
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Completamento</span>
              <span className="font-semibold">{risposteDate} / {DOMANDE.length}</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#C8102E] rounded-full transition-all" style={{ width: `${(risposteDate / DOMANDE.length) * 100}%` }} />
            </div>
          </div>

          {/* Questions by category */}
          {categorie.map((cat) => {
            const items = DOMANDE.map((d, i) => ({ ...d, i })).filter((d) => d.categoria === cat);
            return (
              <div key={cat}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{cat}</p>
                <div className="space-y-4">
                  {items.map(({ testo, ancoraMin, ancoraMax, i }) => (
                    <div key={i}>
                      <p className="text-xs text-gray-700 mb-2 leading-snug">
                        <span className="font-bold text-gray-400 mr-1">{i + 1}.</span>{testo}
                      </p>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1 px-0.5">
                        <span>{ancoraMin}</span>
                        <span>{ancoraMax}</span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 11 }, (_, v) => (
                          <button key={v}
                            onClick={() => setRisposte((prev) => { const n = [...prev]; n[i] = v; return n; })}
                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                              risposte[i] === v
                                ? "bg-[#C8102E] border-[#C8102E] text-white"
                                : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                            }`}>
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Score preview + save */}
          <div className="space-y-3 pt-1">
            {punteggioPreview !== null && (
              <div className={`rounded-xl border p-3 ${interpreta(punteggioPreview).bg}`}>
                <p className="text-xs font-semibold opacity-70 mb-0.5">RTS Score</p>
                <p className="text-2xl font-bold">
                  {punteggioPreview}
                  <span className="text-sm font-normal opacity-60 ml-1">/ 100</span>
                </p>
                <p className="text-xs font-semibold">{interpreta(punteggioPreview).label}</p>
                <p className="text-xs opacity-70 mt-0.5">{interpreta(punteggioPreview).sub}</p>
              </div>
            )}
            <button onClick={handleSalva} disabled={!complete || salvando}
              className="w-full bg-[#C8102E] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-800 disabled:opacity-40 transition-colors">
              {salvando ? "Salvataggio…" : !infortunioSelId ? "Seleziona prima l'infortunio" : risposteDate < DOMANDE.length ? `Rispondi a tutte le domande (${DOMANDE.length - risposteDate} rimaste)` : "Salva valutazione"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

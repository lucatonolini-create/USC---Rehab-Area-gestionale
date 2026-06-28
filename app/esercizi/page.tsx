"use client";

import { useEffect, useState } from "react";
import { Plus, Dumbbell, Trash2, X, ChevronDown } from "lucide-react";
import { loadAtleti, uid, type Atleta } from "@/lib/store";

interface Esercizio {
  nome: string;
  serie: string;
  reps: string;
  intensita: string;
}

interface Programma {
  id: string;
  atletaId: string;
  nome: string;
  fase: string;
  esercizi: Esercizio[];
}

const INTENSITA = ["", "Bassa", "Media", "Alta"];

const intensitaColor: Record<string, string> = {
  "Bassa": "bg-green-100 text-green-700",
  "Media": "bg-yellow-100 text-yellow-700",
  "Alta": "bg-red-100 text-red-700",
  "": "bg-gray-100 text-gray-500",
};

function loadProgrammi(): Programma[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("usc_programmi") || "[]"); } catch { return []; }
}
function saveProgrammi(p: Programma[]) {
  localStorage.setItem("usc_programmi", JSON.stringify(p));
}

export default function EserciziPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [programmi, setProgrammi] = useState<Programma[]>([]);
  const [aperto, setAperto] = useState<string | null>(null);
  const [mostraForm, setMostraForm] = useState(false);
  const [atletaId, setAtletaId] = useState("");
  const [nome, setNome] = useState("");
  const [fase, setFase] = useState("");
  const [esercizi, setEsercizi] = useState<Esercizio[]>([{ nome: "", serie: "", reps: "", intensita: "" }]);

  useEffect(() => {
    setAtleti(loadAtleti());
    setProgrammi(loadProgrammi());
  }, []);

  const salva = (nuovi: Programma[]) => { setProgrammi(nuovi); saveProgrammi(nuovi); };

  const aggiungiEsercizio = () =>
    setEsercizi([...esercizi, { nome: "", serie: "", reps: "", intensita: "" }]);

  const rimuoviEsercizio = (i: number) =>
    setEsercizi(esercizi.filter((_, idx) => idx !== i));

  const aggiungiProgramma = () => {
    if (!atletaId || !nome.trim()) return;
    salva([...programmi, { id: uid(), atletaId, nome, fase, esercizi: esercizi.filter((e) => e.nome.trim()) }]);
    setMostraForm(false);
    setAtletaId(""); setNome(""); setFase("");
    setEsercizi([{ nome: "", serie: "", reps: "", intensita: "" }]);
  };

  const eliminaProgramma = (id: string) => salva(programmi.filter((p) => p.id !== id));

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Programmi di Esercizi</h1>
          <p className="text-gray-500 mt-1">{programmi.length} programmi attivi</p>
        </div>
        <button
          onClick={() => setMostraForm(true)}
          className="flex items-center gap-2 bg-[#C8102E] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-800"
        >
          <Plus className="w-4 h-4" /> Nuovo programma
        </button>
      </div>

      {programmi.length === 0 ? (
        <div className="text-center py-20">
          <Dumbbell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">Nessun programma ancora</p>
          <p className="text-gray-300 text-sm mt-1">Crea un programma di esercizi per i tuoi atleti</p>
        </div>
      ) : (
        <div className="space-y-4">
          {programmi.map((prog) => {
            const atleta = atleti.find((a) => a.id === prog.atletaId);
            return (
              <div key={prog.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <button
                  onClick={() => setAperto(aperto === prog.id ? null : prog.id)}
                  className="w-full flex items-center gap-5 p-6 hover:bg-gray-50 text-left"
                >
                  <div className="w-12 h-12 bg-[#C8102E] rounded-xl flex items-center justify-center shrink-0">
                    <Dumbbell className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{prog.nome}</h3>
                      {prog.fase && (
                        <span className="text-xs bg-[#FFCC00] text-[#C8102E] px-2.5 py-0.5 rounded-full font-medium">
                          {prog.fase}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{atleta?.nome ?? "—"} · {prog.esercizi.length} esercizi</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${aperto === prog.id ? "rotate-180" : ""}`} />
                </button>

                {aperto === prog.id && (
                  <div className="border-t border-gray-100 p-6">
                    {prog.esercizi.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">Nessun esercizio inserito</p>
                    ) : (
                      <div className="space-y-3 mb-4">
                        {prog.esercizi.map((es, i) => (
                          <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-xl px-5 py-3.5">
                            <span className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                              {i + 1}
                            </span>
                            <p className="flex-1 text-sm font-medium text-gray-900">{es.nome}</p>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              {es.serie && <span>{es.serie} × {es.reps}</span>}
                              {es.intensita && (
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${intensitaColor[es.intensita]}`}>
                                  {es.intensita}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => eliminaProgramma(prog.id)}
                      className="flex items-center gap-2 text-red-400 hover:text-red-600 text-sm"
                    >
                      <Trash2 className="w-4 h-4" /> Elimina programma
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modale */}
      {mostraForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Nuovo Programma</h2>
              <button onClick={() => setMostraForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Atleta *</label>
                <select
                  value={atletaId}
                  onChange={(e) => setAtletaId(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white"
                >
                  <option value="">Seleziona atleta...</option>
                  {atleti.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome programma *</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Es. Recupero LCA"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fase</label>
                <input
                  value={fase}
                  onChange={(e) => setFase(e.target.value)}
                  placeholder="Es. Fase 1 – Controllo del dolore"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Esercizi</label>
                  <button onClick={aggiungiEsercizio} className="text-[#C8102E] text-xs font-medium hover:underline">
                    + Aggiungi
                  </button>
                </div>
                <div className="space-y-3">
                  {esercizi.map((es, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={es.nome}
                          onChange={(e) => {
                            const n = [...esercizi]; n[i].nome = e.target.value; setEsercizi(n);
                          }}
                          placeholder="Nome esercizio"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white"
                        />
                        {esercizi.length > 1 && (
                          <button onClick={() => rimuoviEsercizio(i)} className="text-gray-300 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          value={es.serie}
                          onChange={(e) => { const n = [...esercizi]; n[i].serie = e.target.value; setEsercizi(n); }}
                          placeholder="Serie"
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white"
                        />
                        <input
                          value={es.reps}
                          onChange={(e) => { const n = [...esercizi]; n[i].reps = e.target.value; setEsercizi(n); }}
                          placeholder="Reps / tempo"
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white"
                        />
                        <select
                          value={es.intensita}
                          onChange={(e) => { const n = [...esercizi]; n[i].intensita = e.target.value; setEsercizi(n); }}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white"
                        >
                          {INTENSITA.map((v) => <option key={v} value={v}>{v || "Intensità"}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setMostraForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
                Annulla
              </button>
              <button
                onClick={aggiungiProgramma}
                disabled={!atletaId || !nome.trim()}
                className="flex-1 bg-[#C8102E] text-white py-3 rounded-xl text-sm font-medium hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Crea programma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

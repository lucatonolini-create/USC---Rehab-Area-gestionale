"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Dumbbell, Trash2, X, ChevronDown, Edit2, FlaskConical, Gauge, Upload } from "lucide-react";
import {
  loadAtleti, loadProgrammi, saveProgrammi, uid,
  type Atleta, type Programma, type Esercizio, type TestFisiometrico, type Carico,
} from "@/lib/store";

const esVuoto: Esercizio = { nome: "", serie: "", reps: "", rpe: "", vas: "", note: "" };
const testVuoto: TestFisiometrico = { nome: "", risultato: "", unita: "", note: "" };
const caricoVuoto: Carico = { interno: "", esterno: "", durata: "", distanzaTotale: "", velocitaMax: "", hsr: "", accelerazioni: "", note: "" };

const progVuoto: Omit<Programma, "id"> = {
  atletaId: "", nome: "", fase: "",
  data: new Date().toISOString().slice(0, 10),
  esercizi: [{ ...esVuoto }],
  tests: [],
  carico: { ...caricoVuoto },
};

function ScaleInput({ label, value, max, onChange, color }: {
  label: string; value: string; max: number; onChange: (v: string) => void; color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className={`font-bold ${color}`}>{value || "—"}</span>
      </div>
      <input type="range" min={0} max={max} step={1} value={value || 0}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-1.5 rounded-full appearance-none accent-[#C8102E]" />
      <div className="flex justify-between text-xs text-gray-300 mt-0.5">
        <span>0</span><span>{max}</span>
      </div>
    </div>
  );
}

function parseGpsCsv(text: string): Partial<Carico> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return {};
  const sep = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows = lines.slice(1).map((l) => l.split(sep).map((v) => v.trim().replace(/['"]/g, "")));

  const findCol = (...names: string[]) =>
    headers.findIndex((h) => names.some((n) => h.includes(n)));

  const distCol = findCol("distance", "distanza", "dist", "total_dist");
  const speedCol = findCol("speed", "velocity", "velocit", "vel");
  const accCol = findCol("acceleration", "accel");
  const hsrCol = findCol("hsr", "high speed", "high_speed", "sprint");

  let distTotal = 0, speedMax = 0, accCount = 0, hsrTotal = 0;
  rows.forEach((row) => {
    if (distCol >= 0) distTotal += parseFloat(row[distCol]) || 0;
    if (speedCol >= 0) speedMax = Math.max(speedMax, parseFloat(row[speedCol]) || 0);
    if (accCol >= 0 && (parseFloat(row[accCol]) || 0) > 2) accCount++;
    if (hsrCol >= 0) hsrTotal += parseFloat(row[hsrCol]) || 0;
  });

  return {
    distanzaTotale: distTotal > 0 ? (distTotal > 500 ? (distTotal / 1000).toFixed(2) : distTotal.toFixed(2)) : "",
    velocitaMax: speedMax > 0 ? speedMax.toFixed(1) : "",
    accelerazioni: accCount > 0 ? String(accCount) : "",
    hsr: hsrTotal > 0 ? hsrTotal.toFixed(0) : "",
  };
}

type FormSection = "esercizi" | "test" | "carico";

export default function EserciziPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [programmi, setProgrammi] = useState<Programma[]>([]);
  const [aperto, setAperto] = useState<string | null>(null);
  const [mostraForm, setMostraForm] = useState(false);
  const [form, setForm] = useState<Omit<Programma, "id">>(progVuoto);
  const [editId, setEditId] = useState<string | null>(null);
  const [sezioneAttiva, setSezioneAttiva] = useState<FormSection>("esercizi");
  const [gpsCaricando, setGpsCaricando] = useState(false);
  const gpsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAtleti(loadAtleti());
    setProgrammi(loadProgrammi());
  }, []);

  const salva = (nuovi: Programma[]) => { setProgrammi(nuovi); saveProgrammi(nuovi); };

  const apriNuovo = () => {
    setForm({ ...progVuoto, data: new Date().toISOString().slice(0, 10), esercizi: [{ ...esVuoto }], tests: [], carico: { ...caricoVuoto } });
    setEditId(null); setMostraForm(true); setSezioneAttiva("esercizi");
  };

  const apriModifica = (p: Programma) => {
    const { id, ...rest } = p;
    setForm({ ...rest, esercizi: rest.esercizi.map((e) => ({ ...e })), tests: (rest.tests ?? []).map((t) => ({ ...t })), carico: rest.carico ?? { ...caricoVuoto } });
    setEditId(id); setMostraForm(true); setSezioneAttiva("esercizi");
  };

  const salvaProgramma = () => {
    if (!form.atletaId || !form.nome.trim()) return;
    const pulito = { ...form, esercizi: form.esercizi.filter((e) => e.nome.trim()), tests: (form.tests ?? []).filter((t) => t.nome.trim()) };
    if (editId) {
      salva(programmi.map((p) => (p.id === editId ? { ...pulito, id: editId } : p)));
    } else {
      salva([...programmi, { ...pulito, id: uid() }]);
    }
    setMostraForm(false);
  };

  const eliminaProgramma = (id: string) => salva(programmi.filter((p) => p.id !== id));

  // Esercizi
  const aggiungiEs = () => setForm({ ...form, esercizi: [...form.esercizi, { ...esVuoto }] });
  const rimuoviEs = (i: number) => setForm({ ...form, esercizi: form.esercizi.filter((_, idx) => idx !== i) });
  const aggiornaEs = (i: number, campo: keyof Esercizio, val: string) => {
    setForm({ ...form, esercizi: form.esercizi.map((e, idx) => idx === i ? { ...e, [campo]: val } : e) });
  };

  // Test
  const tests = form.tests ?? [];
  const aggiungiTest = () => setForm({ ...form, tests: [...tests, { ...testVuoto }] });
  const rimuoviTest = (i: number) => setForm({ ...form, tests: tests.filter((_, idx) => idx !== i) });
  const aggiornaTest = (i: number, campo: keyof TestFisiometrico, val: string) => {
    setForm({ ...form, tests: tests.map((t, idx) => idx === i ? { ...t, [campo]: val } : t) });
  };

  // Carico
  const carico = form.carico ?? { ...caricoVuoto };
  const aggiornaCarico = (campo: keyof Carico, val: string) => setForm({ ...form, carico: { ...carico, [campo]: val } });

  const handleGpsFile = async (file: File | null) => {
    if (!file) return;
    setGpsCaricando(true);
    const text = await file.text();
    const parsed = parseGpsCsv(text);
    setForm({ ...form, carico: { ...carico, ...parsed } });
    setGpsCaricando(false);
  };

  const perAtleta: Record<string, { atleta: Atleta; programmi: Programma[] }> = {};
  programmi.forEach((p) => {
    const a = atleti.find((a) => a.id === p.atletaId);
    if (!a) return;
    if (!perAtleta[p.atletaId]) perAtleta[p.atletaId] = { atleta: a, programmi: [] };
    perAtleta[p.atletaId].programmi.push(p);
  });

  const tabClass = (s: FormSection) =>
    `flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${sezioneAttiva === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Programmi di Lavoro</h1>
          <p className="text-gray-500 mt-1">{programmi.length} programmi attivi</p>
        </div>
        <button onClick={apriNuovo}
          className="flex items-center gap-2 bg-[#C8102E] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-800">
          <Plus className="w-4 h-4" /> Nuovo programma
        </button>
      </div>

      {programmi.length === 0 ? (
        <div className="text-center py-20">
          <Dumbbell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">Nessun programma ancora</p>
          <p className="text-gray-300 text-sm mt-1">Crea un programma di lavoro per i tuoi atleti</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.values(perAtleta).map(({ atleta, programmi: lista }) => (
            <div key={atleta.id}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {atleta.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <span className="font-bold text-gray-800">{atleta.nome}</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{atleta.categoria}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="space-y-3 ml-11">
                {lista.map((prog) => (
                  <div key={prog.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <button onClick={() => setAperto(aperto === prog.id ? null : prog.id)}
                      className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 text-left">
                      <div className="w-10 h-10 bg-[#C8102E] rounded-xl flex items-center justify-center shrink-0">
                        <Dumbbell className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{prog.nome}</h3>
                          {prog.fase && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{prog.fase}</span>}
                        </div>
                        <p className="text-xs text-gray-400">
                          {prog.data ? new Date(prog.data + "T12:00").toLocaleDateString("it-IT") : ""} ·{" "}
                          {prog.esercizi.length} esercizi
                          {prog.tests?.length ? ` · ${prog.tests.length} test` : ""}
                        </p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${aperto === prog.id ? "rotate-180" : ""}`} />
                    </button>

                    {aperto === prog.id && (
                      <div className="border-t border-gray-100 p-5">
                        {/* Esercizi */}
                        {prog.esercizi.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Esercizi</p>
                            <div className="space-y-3">
                              {prog.esercizi.map((es, i) => (
                                <div key={i} className="bg-gray-50 rounded-xl p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-semibold text-gray-900 text-sm">{i + 1}. {es.nome}</p>
                                    {(es.serie || es.reps) && (
                                      <span className="text-xs text-gray-500">{es.serie && `${es.serie}×`}{es.reps}</span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    {es.rpe && (
                                      <div>
                                        <p className="text-xs text-gray-400 mb-1">RPE</p>
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(Number(es.rpe) / 10) * 100}%` }} />
                                          </div>
                                          <span className="text-xs font-bold text-orange-500">{es.rpe}/10</span>
                                        </div>
                                      </div>
                                    )}
                                    {es.vas && (
                                      <div>
                                        <p className="text-xs text-gray-400 mb-1">VAS</p>
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${(Number(es.vas) / 10) * 100}%` }} />
                                          </div>
                                          <span className="text-xs font-bold text-red-500">{es.vas}/10</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {es.note && <p className="text-xs text-gray-500 mt-2 italic">{es.note}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Test */}
                        {prog.tests && prog.tests.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                              <FlaskConical className="w-3.5 h-3.5" /> Test fisiometrici
                            </p>
                            <div className="overflow-hidden rounded-xl border border-gray-100">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <th className="text-left px-4 py-2">Test</th>
                                    <th className="text-right px-4 py-2">Risultato</th>
                                    <th className="text-right px-4 py-2">Unità</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {prog.tests.map((t, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                      <td className="px-4 py-2.5 font-medium text-gray-900">{t.nome}</td>
                                      <td className="px-4 py-2.5 text-right font-bold text-[#C8102E]">{t.risultato}</td>
                                      <td className="px-4 py-2.5 text-right text-gray-500">{t.unita}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Carico */}
                        {prog.carico && Object.values(prog.carico).some(Boolean) && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                              <Gauge className="w-3.5 h-3.5" /> Carico sessione
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {[
                                { label: "Durata", value: prog.carico.durata, unit: "min" },
                                { label: "Carico interno", value: prog.carico.interno, unit: "" },
                                { label: "Distanza", value: prog.carico.distanzaTotale, unit: "km" },
                                { label: "Vel. max", value: prog.carico.velocitaMax, unit: "km/h" },
                                { label: "HSR", value: prog.carico.hsr, unit: "m" },
                                { label: "Accelerazioni", value: prog.carico.accelerazioni, unit: "" },
                              ].filter((x) => x.value).map(({ label, value, unit }) => (
                                <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                                  <p className="text-xs text-gray-400">{label}</p>
                                  <p className="font-bold text-gray-900 mt-0.5">{value}{unit && <span className="text-xs font-normal text-gray-500 ml-0.5">{unit}</span>}</p>
                                </div>
                              ))}
                            </div>
                            {prog.carico.note && <p className="text-xs text-gray-500 mt-2 italic">{prog.carico.note}</p>}
                          </div>
                        )}

                        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                          <button onClick={() => apriModifica(prog)}
                            className="flex items-center gap-1.5 text-[#C8102E] text-sm font-medium hover:underline">
                            <Edit2 className="w-4 h-4" /> Modifica
                          </button>
                          <button onClick={() => eliminaProgramma(prog.id)}
                            className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 text-sm ml-auto">
                            <Trash2 className="w-4 h-4" /> Elimina
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale */}
      {mostraForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editId ? "Modifica Programma" : "Nuovo Programma"}</h2>
              <button onClick={() => setMostraForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Info base */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Atleta *</label>
                  <select value={form.atletaId} onChange={(e) => setForm({ ...form, atletaId: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white">
                    <option value="">Seleziona atleta...</option>
                    {atleti.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.categoria})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</label>
                  <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome programma *</label>
                  <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Es. Recupero LCA – Settimana 3"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fase</label>
                  <input value={form.fase} onChange={(e) => setForm({ ...form, fase: e.target.value })}
                    placeholder="Es. Fase 2 – Recupero forza"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                </div>
              </div>

              {/* Tab selector */}
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                <button className={tabClass("esercizi")} onClick={() => setSezioneAttiva("esercizi")}>
                  <span className="flex items-center justify-center gap-1"><Dumbbell className="w-3.5 h-3.5" /> Esercizi ({form.esercizi.length})</span>
                </button>
                <button className={tabClass("test")} onClick={() => setSezioneAttiva("test")}>
                  <span className="flex items-center justify-center gap-1"><FlaskConical className="w-3.5 h-3.5" /> Test ({tests.length})</span>
                </button>
                <button className={tabClass("carico")} onClick={() => setSezioneAttiva("carico")}>
                  <span className="flex items-center justify-center gap-1"><Gauge className="w-3.5 h-3.5" /> Carico GPS</span>
                </button>
              </div>

              {/* Sezione Esercizi */}
              {sezioneAttiva === "esercizi" && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Esercizi</label>
                    <button onClick={aggiungiEs} className="text-[#C8102E] text-xs font-semibold hover:underline">+ Aggiungi</button>
                  </div>
                  <div className="space-y-4">
                    {form.esercizi.map((es, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">{i + 1}</span>
                          <input value={es.nome} onChange={(e) => aggiornaEs(i, "nome", e.target.value)}
                            placeholder="Nome esercizio"
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white" />
                          {form.esercizi.length > 1 && (
                            <button onClick={() => rimuoviEs(i)} className="text-gray-300 hover:text-red-400 shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input value={es.serie} onChange={(e) => aggiornaEs(i, "serie", e.target.value)} placeholder="N° serie (es. 3)"
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white" />
                          <input value={es.reps} onChange={(e) => aggiornaEs(i, "reps", e.target.value)} placeholder="Reps / durata"
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-1">
                          <ScaleInput label={`RPE: ${es.rpe || 0}/10`} value={es.rpe} max={10} onChange={(v) => aggiornaEs(i, "rpe", v)} color="text-orange-500" />
                          <ScaleInput label={`VAS: ${es.vas || 0}/10`} value={es.vas} max={10} onChange={(v) => aggiornaEs(i, "vas", v)} color="text-red-500" />
                        </div>
                        <input value={es.note} onChange={(e) => aggiornaEs(i, "note", e.target.value)} placeholder="Note sull'esercizio"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sezione Test */}
              {sezioneAttiva === "test" && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Test fisiometrici e di performance</label>
                    <button onClick={aggiungiTest} className="text-[#C8102E] text-xs font-semibold hover:underline">+ Aggiungi test</button>
                  </div>
                  {tests.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      <FlaskConical className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      Nessun test. Clicca "+ Aggiungi test" per inserire risultati di test fisiometrici o di performance.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tests.map((t, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">{i + 1}</span>
                            <input value={t.nome} onChange={(e) => aggiornaTest(i, "nome", e.target.value)}
                              placeholder="Nome test (es. Single Leg Hop, Y-Balance, Quadricipite/Hamstring…)"
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white" />
                            <button onClick={() => rimuoviTest(i)} className="text-gray-300 hover:text-red-400 shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <input value={t.risultato} onChange={(e) => aggiornaTest(i, "risultato", e.target.value)}
                              placeholder="Risultato (es. 85, 12.4, Positivo)"
                              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white" />
                            <input value={t.unita} onChange={(e) => aggiornaTest(i, "unita", e.target.value)}
                              placeholder="Unità (es. cm, Nm, %, s)"
                              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white" />
                          </div>
                          <input value={t.note} onChange={(e) => aggiornaTest(i, "note", e.target.value)}
                            placeholder="Note (confronto con baseline, lato sx/dx…)"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sezione Carico / GPS */}
              {sezioneAttiva === "carico" && (
                <div className="space-y-4">
                  {/* GPS upload */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">File GPS (CSV)</label>
                    <input ref={gpsInputRef} type="file" accept=".csv,.txt" className="hidden"
                      onChange={(e) => handleGpsFile(e.target.files?.[0] ?? null)} />
                    <button onClick={() => gpsInputRef.current?.click()}
                      className="mt-1 w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-500 hover:border-[#C8102E] hover:text-[#C8102E] transition-all">
                      <Upload className="w-4 h-4" />
                      {gpsCaricando ? "Analisi GPS in corso..." : "Carica file GPS/CSV per auto-compilare i campi"}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">Compatibile con Catapult, STATSports, GPSports – colonne distanza, velocità, acc. rilevate automaticamente</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Durata sessione (min)</label>
                      <input value={carico.durata} onChange={(e) => aggiornaCarico("durata", e.target.value)}
                        placeholder="Es. 75"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Carico interno (RPE sessione)</label>
                      <input value={carico.interno} onChange={(e) => aggiornaCarico("interno", e.target.value)}
                        placeholder="Es. 6 o 450 (RPE×min)"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Carico esterno</label>
                      <input value={carico.esterno} onChange={(e) => aggiornaCarico("esterno", e.target.value)}
                        placeholder="Es. Player Load, ACWR…"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Distanza totale (km)</label>
                      <input value={carico.distanzaTotale} onChange={(e) => aggiornaCarico("distanzaTotale", e.target.value)}
                        placeholder="Es. 4.2"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Velocità max (km/h)</label>
                      <input value={carico.velocitaMax} onChange={(e) => aggiornaCarico("velocitaMax", e.target.value)}
                        placeholder="Es. 24.5"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">HSR &gt;19 km/h (m)</label>
                      <input value={carico.hsr} onChange={(e) => aggiornaCarico("hsr", e.target.value)}
                        placeholder="Es. 350"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accelerazioni (&gt;2 m/s²)</label>
                      <input value={carico.accelerazioni} onChange={(e) => aggiornaCarico("accelerazioni", e.target.value)}
                        placeholder="Es. 42"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Note GPS</label>
                      <input value={carico.note} onChange={(e) => aggiornaCarico("note", e.target.value)}
                        placeholder="Note aggiuntive"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setMostraForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
                Annulla
              </button>
              <button onClick={salvaProgramma} disabled={!form.atletaId || !form.nome.trim()}
                className="flex-1 bg-[#C8102E] text-white py-3 rounded-xl text-sm font-medium hover:bg-red-800 disabled:opacity-40">
                {editId ? "Salva modifiche" : "Crea programma"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

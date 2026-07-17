"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Dumbbell, Trash2, X, ChevronDown, Edit2, FlaskConical, Gauge, Upload, AlertTriangle, Footprints, CalendarX2, Users, BatteryFull } from "lucide-react";
import {
  loadAtleti, loadProgrammi, upsertProgramma, upsertAtleta, deleteProgramma, uid, nd, calcolaProgressoAuto,
  subscribeToAtleti, subscribeToProgrammi,
  TESTS_PREDEFINITI, OBIETTIVI_PALESTRA, OBIETTIVI_CAMPO,
  type Atleta, type Programma, type Esercizio, type TestFisiometrico, type Carico, type EsercizioCampo, type InfortunioStorico,
} from "@/lib/store";

const esVuoto: Esercizio = { nome: "", serie: "", reps: "", carico: "", rir: "", vas: "", note: "" };
const testVuoto: TestFisiometrico = { nome: "", risultatoSx: "", risultatoDx: "", risultato: "", unita: "", note: "" };
const caricoVuoto: Carico = { rpe: "", interno: "", durata: "", distanzaTotale: "", velocitaMax: "", hsr: "", velocita21: "", velocita25: "", accelerazioni: "", decelerazioni: "", sprint: "", note: "" };
const campoVuoto: EsercizioCampo = { tipo: "", serie: "", durata: "", descrizione: "", vas: "" };

const progVuoto: Omit<Programma, "id"> = {
  atletaId: "", nome: "", fase: "",
  data: new Date().toISOString().slice(0, 10),
  esercizi: [],
  esercizicampo: [],
  obiettiviPalestra: [],
  obiettiviCampo: [],
  tests: [],
  carico: { ...caricoVuoto },
  assente: false,
  riposo: false,
  squadra: false,
  noteAssenza: "",
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

function calcolaAsimmetria(sx: string, dx: string): number | null {
  const a = parseFloat(sx), b = parseFloat(dx);
  if (isNaN(a) || isNaN(b) || a <= 0 || b <= 0) return null;
  return Math.abs(a - b) / Math.max(a, b) * 100;
}

function superioreTest(sx: string, dx: string): "Dx" | "Sx" | null {
  const a = parseFloat(sx), b = parseFloat(dx);
  if (isNaN(a) || isNaN(b) || a === b) return null;
  return b > a ? "Dx" : "Sx";
}

function trovaPrecedenteTest(lista: Programma[], currentId: string, nomeTest: string): import("@/lib/store").TestFisiometrico | null {
  const sorted = [...lista]
    .filter(p => !p.assente && !p.riposo && !p.squadra && p.tests?.length)
    .sort((a, b) => a.data.localeCompare(b.data));
  const idx = sorted.findIndex(p => p.id === currentId);
  if (idx <= 0) return null;
  for (let k = idx - 1; k >= 0; k--) {
    const found = (sorted[k].tests ?? []).find(tt => tt.nome === nomeTest);
    if (found) return found;
  }
  return null;
}

function calcolaDelta(curr: import("@/lib/store").TestFisiometrico, prev: import("@/lib/store").TestFisiometrico | null): number | null {
  if (!prev) return null;
  const avg = (vals: (string | undefined)[]) => {
    const ns = vals.map(v => parseFloat(v ?? "")).filter(v => !isNaN(v) && v > 0);
    return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : NaN;
  };
  // SL Drop Jump: RSI per limb average
  if (curr.rsiSx || curr.rsiDx) {
    const c = avg([curr.rsiSx, curr.rsiDx]), p = avg([prev.rsiSx, prev.rsiDx]);
    if (isNaN(c) || isNaN(p) || p <= 0) return null;
    return ((c - p) / p) * 100;
  }
  // Drop Jump: RSI
  if (curr.rsi && prev.rsi) {
    const c = parseFloat(curr.rsi), p = parseFloat(prev.rsi);
    if (isNaN(c) || isNaN(p) || p <= 0) return null;
    return ((c - p) / p) * 100;
  }
  // Bilateral (Sx + Dx)
  if (curr.risultatoSx || curr.risultatoDx) {
    const c = avg([curr.risultatoSx, curr.risultatoDx]);
    const p = avg([prev.risultatoSx, prev.risultatoDx]);
    if (isNaN(c) || isNaN(p) || p <= 0) return null;
    return ((c - p) / p) * 100;
  }
  // Single value
  if (curr.risultato && prev.risultato) {
    const c = parseFloat(curr.risultato), p = parseFloat(prev.risultato);
    if (isNaN(c) || isNaN(p) || p <= 0) return null;
    return ((c - p) / p) * 100;
  }
  return null;
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

type FormSection = "esercizi" | "campo" | "test" | "carico";

export default function EserciziPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [programmiPerAtleta, setProgrammiPerAtleta] = useState<Record<string, Programma[]>>({});
  const [atletaAperto, setAtletaAperto] = useState<string | null>(null);
  const [caricandoAtleta, setCaricandoAtleta] = useState(false);
  const [aperto, setAperto] = useState<string | null>(null);
  const [mostraForm, setMostraForm] = useState(false);
  const [form, setForm] = useState<Omit<Programma, "id">>(progVuoto);
  const [editId, setEditId] = useState<string | null>(null);
  const [sezioneAttiva, setSezioneAttiva] = useState<FormSection>("esercizi");
  const [gpsCaricando, setGpsCaricando] = useState(false);
  const gpsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAtleti().then(setAtleti);
    const unsubAtleti = subscribeToAtleti(() => loadAtleti().then(setAtleti));
    const unsubProgrammi = subscribeToProgrammi((atletaId) => {
      if (atletaId) {
        loadProgrammi(atletaId).then((progs) =>
          setProgrammiPerAtleta((prev) => ({ ...prev, [atletaId]: progs }))
        );
      }
    });
    return () => { unsubAtleti(); unsubProgrammi(); };
  }, []);

  const apriAtleta = async (atletaId: string) => {
    if (atletaAperto === atletaId) { setAtletaAperto(null); return; }
    setAtletaAperto(atletaId);
    if (!(atletaId in programmiPerAtleta)) {
      setCaricandoAtleta(true);
      const progs = await loadProgrammi(atletaId);
      setProgrammiPerAtleta((prev) => ({ ...prev, [atletaId]: progs }));
      setCaricandoAtleta(false);
    }
  };

  const apriNuovo = () => {
    setForm({ ...progVuoto, data: new Date().toISOString().slice(0, 10), esercizi: [], esercizicampo: [], tests: [], carico: { ...caricoVuoto }, assente: false, riposo: false, squadra: false, noteAssenza: "" });
    setEditId(null); setMostraForm(true); setSezioneAttiva("esercizi");
  };

  const apriModifica = (p: Programma) => {
    const { id, ...rest } = p;
    setForm({ ...rest, esercizi: rest.esercizi.map((e) => ({ ...e })), esercizicampo: (rest.esercizicampo ?? []).map((c) => ({ ...c })), tests: (rest.tests ?? []).map((t) => ({ ...t })), carico: rest.carico ?? { ...caricoVuoto } });
    setEditId(id); setMostraForm(true); setSezioneAttiva("esercizi");
    if (rest.atletaId && !(rest.atletaId in programmiPerAtleta)) {
      loadProgrammi(rest.atletaId).then((progs) =>
        setProgrammiPerAtleta((prev) => ({ ...prev, [rest.atletaId]: progs }))
      ).catch(() => {});
    }
  };

  const salvaProgramma = async () => {
    if (!form.atletaId) return;
    const nomeEffettivo = form.assente && !form.nome.trim() ? "Assenza" : form.riposo && !form.nome.trim() ? "Riposo" : form.squadra && !form.nome.trim() ? "Squadra" : form.nome;
    if (!nomeEffettivo.trim()) return;
    const pulito = { ...form, nome: nomeEffettivo, esercizi: form.esercizi.filter((e) => e.nome.trim()), esercizicampo: (form.esercizicampo ?? []).filter((c) => c.tipo), tests: (form.tests ?? []).filter((t) => t.nome.trim()) };
    const prog: Programma = editId ? { ...pulito, id: editId } : { ...pulito, id: uid() };
    await upsertProgramma(prog);
    setProgrammiPerAtleta((prev) => {
      const id = prog.atletaId;
      if (!(id in prev)) return prev;
      const lista = prev[id];
      return { ...prev, [id]: editId ? lista.map((p) => p.id === editId ? prog : p) : [...lista, prog] };
    });

    // Quando si registra "Squadra", porta automaticamente l'atleta a Disponibile
    if (form.squadra) {
      const atleta = atleti.find((a) => a.id === form.atletaId);
      if (atleta && atleta.stato === "Infortunato") {
        const fineRehab = prog.data; // usa la data della sessione come fine riabilitazione
        const diagnosi = atleta.infortunio;
        const inizioRehab = atleta.inizioRehab;
        const tipo = atleta.tipoInfortunio;
        const nuovoStorico: InfortunioStorico[] = [...(atleta.storicoInfortuni ?? [])];
        if (diagnosi || inizioRehab) {
          nuovoStorico.push({
            id: uid(),
            tipo,
            diagnosi: diagnosi || "—",
            inizioRehab: inizioRehab || "",
            fineRehab,
            note: atleta.note || undefined,
          });
        }
        const aggiornato: Atleta = {
          ...atleta,
          stato: "Disponibile",
          fineRehab,
          storicoInfortuni: nuovoStorico,
          infortunio: "",
          tipoInfortunio: undefined,
          inizioRehab: "",
          progresso: 100,
        };
        aggiornato.progresso = calcolaProgressoAuto(aggiornato);
        await upsertAtleta(aggiornato);
        setAtleti((prev) => prev.map((a) => a.id === aggiornato.id ? aggiornato : a));
      }
    }

    setMostraForm(false);
  };

  const eliminaProgramma = async (id: string) => {
    await deleteProgramma(id);
    setProgrammiPerAtleta((prev) => {
      const updated: Record<string, Programma[]> = {};
      for (const [aid, lista] of Object.entries(prev)) updated[aid] = lista.filter((p) => p.id !== id);
      return updated;
    });
  };

  // Esercizi
  const aggiungiEs = () => setForm({ ...form, esercizi: [...form.esercizi, { ...esVuoto }] });
  const rimuoviEs = (i: number) => setForm({ ...form, esercizi: form.esercizi.filter((_, idx) => idx !== i) });
  const aggiornaEs = (i: number, campo: keyof Esercizio, val: string) => {
    setForm({ ...form, esercizi: form.esercizi.map((e, idx) => idx === i ? { ...e, [campo]: val } : e) });
  };

  // Esercizi in campo
  const esercizicampo = form.esercizicampo ?? [];
  const aggiungiCampo = () => setForm({ ...form, esercizicampo: [...esercizicampo, { ...campoVuoto }] });
  const rimuoviCampo = (i: number) => setForm({ ...form, esercizicampo: esercizicampo.filter((_, idx) => idx !== i) });
  const aggiornaCampo = (i: number, campo: keyof EsercizioCampo, val: string) => {
    setForm({ ...form, esercizicampo: esercizicampo.map((c, idx) => idx === i ? { ...c, [campo]: val } : c) });
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
  const aggiornaCarico = (campo: keyof Carico, val: string) => {
    const next = { ...carico, [campo]: val };
    if (campo === "rpe" || campo === "durata") {
      const r = Number(campo === "rpe" ? val : next.rpe);
      const d = Number(campo === "durata" ? val : next.durata);
      next.interno = r > 0 && d > 0 ? String(Math.round(r * d)) : next.interno;
    }
    setForm({ ...form, carico: next });
  };

  const handleGpsFile = async (file: File | null) => {
    if (!file) return;
    setGpsCaricando(true);
    const text = await file.text();
    const parsed = parseGpsCsv(text);
    setForm({ ...form, carico: { ...carico, ...parsed } });
    setGpsCaricando(false);
  };

  const tabClass = (s: FormSection) =>
    `flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${sezioneAttiva === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`;

  const fontePerSuggerimenti = (programmiPerAtleta[form.atletaId] ?? []).filter((p) => !p.assente && !p.riposo && !p.squadra);
  const nomiUnici = Array.from(new Set(fontePerSuggerimenti.map((p) => p.nome).filter(Boolean)));
  const fasiUniche = Array.from(new Set(fontePerSuggerimenti.map((p) => p.fase).filter(Boolean)));
  const nomiFiltrati = nomiUnici.filter((n) => !form.nome.trim() || n.toLowerCase().includes(form.nome.toLowerCase())).slice(0, 6);
  const fasiFiltrate = fasiUniche.filter((f) => !form.fase.trim() || f.toLowerCase().includes(form.fase.toLowerCase())).slice(0, 6);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programmi <span className="whitespace-nowrap">di Lavoro</span></h1>
          <p className="text-gray-500 mt-0.5 text-sm">{atleti.length} atleti</p>
        </div>
        <button onClick={apriNuovo}
          className="flex items-center gap-1.5 bg-[#C8102E] text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-red-800 shrink-0 whitespace-nowrap">
          <Plus className="w-4 h-4" /> Nuovo programma
        </button>
      </div>

      {atleti.length === 0 ? (
        <div className="text-center py-20">
          <Dumbbell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">Nessun atleta ancora</p>
          <p className="text-gray-300 text-sm mt-1">Aggiungi prima un atleta per creare programmi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {atleti.map((atleta) => {
            const isOpen = atletaAperto === atleta.id;
            const lista = programmiPerAtleta[atleta.id] ?? [];
            return (
            <div key={atleta.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button onClick={() => apriAtleta(atleta.id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 text-left">
                <div className="w-8 h-8 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {nd(atleta).trim().split(/\s+/).filter(Boolean).slice(0,2).map((w:string)=>(w[0]??"").toUpperCase()).join("")}
                </div>
                <span className="font-bold text-gray-800 flex-1">{nd(atleta)}</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{atleta.categoria}</span>
                {isOpen && atleta.id in programmiPerAtleta && (() => {
                  const assenze = lista.filter((p) => p.assente).length;
                  const riposi = lista.filter((p) => p.riposo).length;
                  const squadre = lista.filter((p) => p.squadra).length;
                  return (
                    <span className="text-xs text-gray-400">
                      {lista.length} sessioni{assenze > 0 && <span className="text-orange-400"> · {assenze} ass.</span>}{riposi > 0 && <span className="text-blue-400"> · {riposi} rip.</span>}{squadre > 0 && <span className="text-[#C8102E]"> · {squadre} sq.</span>}
                    </span>
                  );
                })()}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                  {caricandoAtleta && !(atleta.id in programmiPerAtleta) ? (
                    <p className="text-sm text-gray-400 text-center py-4">Caricamento…</p>
                  ) : lista.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">Nessun programma per questo atleta</p>
                  ) : (
                  <div className="space-y-4">
                {(() => {
                  const gruppi = new Map<string | null, Programma[]>();
                  lista.forEach((p) => {
                    const k = p.infortunioId ?? null;
                    if (!gruppi.has(k)) gruppi.set(k, []);
                    gruppi.get(k)!.push(p);
                  });
                  const multiGroups = lista.some((p) => p.infortunioId) && gruppi.size > 1;
                  return Array.from(gruppi.entries()).map(([key, progs]) => {
                    let lbl: { diagnosi: string; tipo?: string } | null = null;
                    if (multiGroups && key) {
                      if (key === "__corrente__") {
                        lbl = { diagnosi: atleta.infortunio || "Infortunio corrente", tipo: atleta.tipoInfortunio };
                      } else {
                        const st = (atleta.storicoInfortuni ?? []).find((s) => s.id === key);
                        if (st) lbl = { diagnosi: st.diagnosi, tipo: st.tipo };
                      }
                    }
                    return (
                      <div key={key ?? "__none__"} className="space-y-2">
                        {lbl && (
                          <div className="flex items-center gap-2 px-1 py-1.5 border-b border-gray-100 pb-2">
                            {lbl.tipo && <span className="text-xs bg-red-50 text-[#C8102E] font-bold px-2 py-0.5 rounded-full">{lbl.tipo}</span>}
                            <span className="text-sm font-semibold text-gray-700">{lbl.diagnosi}</span>
                          </div>
                        )}
                        {progs.map((prog) => (
                  <div key={prog.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${prog.assente ? "border-orange-100" : prog.riposo ? "border-blue-100" : prog.squadra ? "border-red-100" : "border-gray-100"}`}>
                    <button onClick={() => setAperto(aperto === prog.id ? null : prog.id)}
                      className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 text-left">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${prog.assente ? "bg-orange-400" : prog.riposo ? "bg-blue-400" : prog.squadra ? "bg-[#C8102E]" : "bg-[#C8102E]"}`}>
                        {prog.assente ? <CalendarX2 className="w-5 h-5 text-white" /> : prog.riposo ? <CalendarX2 className="w-5 h-5 text-white" /> : prog.squadra ? <Users className="w-5 h-5 text-white" /> : <Dumbbell className="w-5 h-5 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{prog.nome}</h3>
                          {prog.assente && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">Assente</span>}
                          {prog.riposo && <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">Riposo</span>}
                          {prog.squadra && <span className="text-xs bg-red-100 text-[#C8102E] font-semibold px-2 py-0.5 rounded-full">Squadra</span>}
                          {prog.fase && !prog.assente && !prog.riposo && !prog.squadra && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{prog.fase}</span>}
                        </div>
                        <p className="text-xs text-gray-400">
                          {prog.data ? new Date(prog.data + "T12:00").toLocaleDateString("it-IT") : ""}
                          {prog.assente
                            ? (prog.noteAssenza ? ` · ${prog.noteAssenza}` : "")
                            : prog.riposo
                            ? (prog.noteAssenza ? ` · ${prog.noteAssenza}` : "")
                            : (<>{" "}· {prog.esercizi.length} esercizi{prog.esercizicampo?.length ? ` · ${prog.esercizicampo.length} in campo` : ""}{prog.tests?.length ? ` · ${prog.tests.length} test` : ""}</>)
                          }
                        </p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${aperto === prog.id ? "rotate-180" : ""}`} />
                    </button>

                    {aperto === prog.id && (
                      <div className="border-t border-gray-100 p-5">
                        {/* Esercizi */}
                        {prog.esercizi.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1"><Dumbbell className="w-3.5 h-3.5" /> Esercizi in Palestra</p>
                            <div className="space-y-2">
                              {prog.esercizi.map((es, i) => (
                                <div key={i} className="bg-gray-100 border border-gray-300 rounded-xl p-3">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <p className="font-semibold text-gray-900 text-sm">{es.nome}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      {es.serie && <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full">{es.serie} serie</span>}
                                      {es.reps && <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full">{es.reps}</span>}
                                      {es.carico && <span className="bg-white border border-blue-200 text-blue-600 px-2 py-0.5 rounded-full">{es.carico}</span>}
                                      {es.rir && <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full">RIR {es.rir}</span>}
                                      {es.vas && <span className="bg-white border border-red-200 text-red-600 px-2 py-0.5 rounded-full">VAS {es.vas}/10</span>}
                                    </div>
                                  </div>
                                  {es.note && <p className="text-xs text-gray-500 mt-1.5 italic">{es.note}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Esercizi in campo */}
                        {prog.esercizicampo && prog.esercizicampo.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                              <Footprints className="w-3.5 h-3.5" /> Esercizi in campo
                            </p>
                            <div className="space-y-2">
                              {prog.esercizicampo.map((c, i) => (
                                <div key={i} className="bg-gray-100 border border-gray-300 rounded-xl p-3">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <p className="font-semibold text-gray-900 text-sm">{c.tipo}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      {c.serie && <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full">{c.serie} serie</span>}
                                      {c.durata && <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full">{c.durata}</span>}
                                      {c.vas && <span className="bg-white border border-red-200 text-red-600 px-2 py-0.5 rounded-full">VAS {c.vas}/10</span>}
                                    </div>
                                  </div>
                                  {c.descrizione && <p className="text-xs text-gray-500 mt-1.5 italic">{c.descrizione}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Test */}
                        {prog.tests && prog.tests.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                              <FlaskConical className="w-3.5 h-3.5" /> Test fisioterapici
                            </p>
                            <div className="space-y-2">
                              {prog.tests.map((t, i) => {
                                const isDropJump   = t.nome === "Drop Jump";
                                const isSLDropJump = t.nome === "SL Drop Jump";
                                const asim = isSLDropJump
                                  ? calcolaAsimmetria(t.rsiSx ?? "", t.rsiDx ?? "")
                                  : calcolaAsimmetria(t.risultatoSx, t.risultatoDx);
                                const sup = isSLDropJump
                                  ? superioreTest(t.rsiSx ?? "", t.rsiDx ?? "")
                                  : superioreTest(t.risultatoSx, t.risultatoDx);
                                const prevTest = trovaPrecedenteTest(lista, prog.id, t.nome);
                                const delta = calcolaDelta(t, prevTest);
                                return (
                                  <div key={i} className={`rounded-xl p-3 border ${asim !== null && asim > 10 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"}`}>
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <p className="font-semibold text-gray-900 text-sm">{t.nome === "Personalizzato" ? t.risultato : t.nome}</p>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {asim !== null && sup !== null && (
                                          <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${asim > 10 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                            {asim > 10 && <AlertTriangle className="w-3 h-3" />}
                                            {sup} +{asim.toFixed(1)}%
                                          </span>
                                        )}
                                        {delta !== null && (
                                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${delta >= 0 ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>
                                            {delta >= 0 ? "↑" : "↓"} {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {isDropJump ? (
                                      <div className="flex gap-4 mt-1.5 text-xs text-gray-600">
                                        {t.altezzaSalto && <span>Altezza: <strong>{t.altezzaSalto} cm</strong></span>}
                                        {t.tempoContatto && <span>Contatto: <strong>{t.tempoContatto} ms</strong></span>}
                                        {t.rsi && <span>RSI: <strong>{t.rsi}</strong></span>}
                                      </div>
                                    ) : isSLDropJump ? (
                                      <div className="grid grid-cols-2 gap-3 mt-1.5 text-xs text-gray-600">
                                        <div>
                                          <span className="font-semibold text-blue-600">Sx</span>
                                          {t.altezzaSaltoSx && <span className="ml-2">↕ <strong>{t.altezzaSaltoSx} cm</strong></span>}
                                          {t.tempoContattoSx && <span className="ml-2">⏱ <strong>{t.tempoContattoSx} ms</strong></span>}
                                          {t.rsiSx && <span className="ml-2">RSI <strong>{t.rsiSx}</strong></span>}
                                        </div>
                                        <div>
                                          <span className="font-semibold text-orange-600">Dx</span>
                                          {t.altezzaSaltoDx && <span className="ml-2">↕ <strong>{t.altezzaSaltoDx} cm</strong></span>}
                                          {t.tempoContattoDx && <span className="ml-2">⏱ <strong>{t.tempoContattoDx} ms</strong></span>}
                                          {t.rsiDx && <span className="ml-2">RSI <strong>{t.rsiDx}</strong></span>}
                                        </div>
                                      </div>
                                    ) : (t.risultatoSx || t.risultatoDx) ? (
                                      <div className="flex gap-4 mt-1.5 text-xs text-gray-600">
                                        {t.risultatoSx && <span>Sx: <strong className="text-gray-900">{t.risultatoSx}{t.unita && ` ${t.unita}`}</strong></span>}
                                        {t.risultatoDx && <span>Dx: <strong className="text-gray-900">{t.risultatoDx}{t.unita && ` ${t.unita}`}</strong></span>}
                                      </div>
                                    ) : t.risultato ? (
                                      <p className="text-xs text-gray-600 mt-0.5">{t.risultato} {t.unita}</p>
                                    ) : null}
                                    {t.note && <p className="text-xs text-gray-400 mt-1 italic">{t.note}</p>}
                                  </div>
                                );
                              })}
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
                                { label: "RPE", value: prog.carico.rpe, unit: "/10" },
                                { label: "Durata", value: prog.carico.durata, unit: "min" },
                                { label: "Training Load", value: prog.carico.interno, unit: "" },
                                { label: "Distanza", value: prog.carico.distanzaTotale, unit: "km" },
                                { label: "Vel. max", value: prog.carico.velocitaMax, unit: "km/h" },
                                { label: "Vel. >18 km/h", value: prog.carico.hsr, unit: "m" },
                                { label: "Vel. >21 km/h", value: prog.carico.velocita21, unit: "m" },
                                { label: "Vel. >25 km/h", value: prog.carico.velocita25, unit: "m" },
                                { label: "Acc. >3 m/s²", value: prog.carico.accelerazioni, unit: "" },
                                { label: "Dec. >3 m/s²", value: prog.carico.decelerazioni, unit: "" },
                                { label: "Sprint", value: prog.carico.sprint, unit: "" },
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
                    );
                  });
                })()}
                  </div>
                  )}
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
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editId ? "Modifica Programma" : "Nuovo Programma"}</h2>
              <button onClick={() => setMostraForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Info base */}
              <div className="flex gap-3 items-end">
                <div className="flex-1 min-w-0">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Atleta *</label>
                  <select value={form.atletaId} onChange={(e) => {
                      const id = e.target.value;
                      setForm({ ...form, atletaId: id, infortunioId: undefined, infortunioLabel: undefined });
                      if (id && !(id in programmiPerAtleta)) {
                        loadProgrammi(id).then((progs) =>
                          setProgrammiPerAtleta((prev) => ({ ...prev, [id]: progs }))
                        ).catch(() => {});
                      }
                    }}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white">
                    <option value="">Seleziona atleta...</option>
                    {atleti.map((a) => <option key={a.id} value={a.id}>{nd(a)} ({a.categoria})</option>)}
                  </select>
                </div>
                <div className="shrink-0">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">Data</label>
                  <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })}
                    style={{ width: "6rem" }}
                    className="mt-1 border border-gray-200 rounded-xl px-2 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white" />
                </div>
              </div>

              {/* Presente / Assente / Riposo / Squadra */}
              {(() => {
                const isPresente = !form.assente && !form.riposo && !form.squadra;
                const opts: { label: string; icon: React.ReactNode; active: boolean; color: "green"|"orange"|"blue"|"red"; onClick: () => void }[] = [
                  { label: "Presente", icon: <span className="text-lg leading-none">✓</span>, active: isPresente, color: "green",  onClick: () => setForm({ ...form, assente: false, riposo: false, squadra: false }) },
                  { label: "Assente",  icon: <span className="text-lg leading-none">✕</span>, active: !!form.assente,  color: "orange", onClick: () => setForm({ ...form, assente: true,  riposo: false, squadra: false }) },
                  { label: "Riposo",   icon: <BatteryFull className="w-5 h-5" />,             active: !!form.riposo,   color: "blue",   onClick: () => setForm({ ...form, assente: false, riposo: true,  squadra: false }) },
                  { label: "Squadra",  icon: <Users className="w-5 h-5" />,                   active: !!form.squadra,  color: "red",    onClick: () => setForm({ ...form, assente: false, riposo: false, squadra: true  }) },
                ];
                const activeClass: Record<"green"|"orange"|"blue"|"red", string> = {
                  green:  "bg-green-500  border-green-500  text-white",
                  orange: "bg-orange-500 border-orange-500 text-white",
                  blue:   "bg-blue-500   border-blue-500   text-white",
                  red:    "bg-[#C8102E]  border-[#C8102E]  text-white",
                };
                return (
                  <div className="grid grid-cols-4 gap-2">
                    {opts.map(({ label, icon, active, color, onClick }) => (
                      <button key={label} type="button" onClick={onClick}
                        className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all ${active ? activeClass[color] : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                        {icon}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* Nota assenza / riposo */}
              {(form.assente || form.riposo) && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{form.assente ? "Motivo assenza" : "Note riposo"}</label>
                  <textarea value={form.noteAssenza ?? ""}
                    onChange={(e) => setForm({ ...form, noteAssenza: e.target.value })}
                    placeholder={form.assente ? "Es. Febbre, impegno scolastico, infortunio acuto…" : "Es. Riposo programmato, recupero…"}
                    rows={2}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] resize-none" />
                </div>
              )}

              {/* Injury selector + Nome/Fase + Tab */}
              {!form.assente && !form.riposo && !form.squadra && <>
              {(() => {
                const atletaSelezionato = atleti.find((a) => a.id === form.atletaId);
                if (!atletaSelezionato) return null;
                const opzioniInf = [
                  ...(atletaSelezionato.stato === "Infortunato" && (atletaSelezionato.infortunio || atletaSelezionato.inizioRehab)
                    ? [{ id: "__corrente__", label: `In corso: ${atletaSelezionato.infortunio || "—"}` }]
                    : []),
                  ...[...(atletaSelezionato.storicoInfortuni ?? [])].reverse().map((inf) => ({
                    id: inf.id,
                    label: `${inf.diagnosi}${inf.tipo ? ` (${inf.tipo})` : ""}`,
                  })),
                ];
                if (opzioniInf.length === 0) return null;
                return (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Infortunio di riferimento</label>
                    <select
                      value={form.infortunioId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        const label = opzioniInf.find((o) => o.id === id)?.label ?? "";
                        setForm({ ...form, infortunioId: id || undefined, infortunioLabel: id ? label : undefined });
                      }}
                      className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white">
                      <option value="">— Nessuno / Non specificato —</option>
                      {opzioniInf.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                );
              })()}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome programma *</label>
                  <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Scrivi nuovo nome..."
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                  {nomiUnici.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {nomiFiltrati.map((n) => (
                        <button key={n} type="button"
                          onClick={() => setForm({ ...form, nome: n })}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.nome === n ? "bg-[#C8102E] text-white border-[#C8102E]" : "bg-gray-50 text-gray-600 border-gray-200 active:bg-red-50 active:text-[#C8102E] active:border-[#C8102E]"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fase</label>
                  <input value={form.fase} onChange={(e) => setForm({ ...form, fase: e.target.value })}
                    placeholder="Scrivi nuova fase..."
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                  {fasiUniche.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {fasiFiltrate.map((f) => (
                        <button key={f} type="button"
                          onClick={() => setForm({ ...form, fase: f })}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.fase === f ? "bg-[#C8102E] text-white border-[#C8102E]" : "bg-gray-50 text-gray-600 border-gray-200 active:bg-red-50 active:text-[#C8102E] active:border-[#C8102E]"}`}>
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {([
                  { key: "esercizi" as FormSection, label: "Palestra", icon: Dumbbell,     count: form.esercizi.length },
                  { key: "campo"    as FormSection, label: "Campo",    icon: Footprints,   count: esercizicampo.length },
                  { key: "test"     as FormSection, label: "Test",     icon: FlaskConical, count: tests.length },
                  { key: "carico"   as FormSection, label: "GPS",      icon: Gauge,        count: null },
                ]).map(({ key, label, icon: Icon, count }) => (
                  <button key={key} className={tabClass(key)} onClick={() => setSezioneAttiva(key)}>
                    <span className="flex flex-col items-center gap-0.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex items-center gap-1">
                        {label}
                        {count !== null && count > 0 && (
                          <span className="bg-[#C8102E] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">{count}</span>
                        )}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              {/* Sezione Esercizi */}
              {sezioneAttiva === "esercizi" && (
                <div>
                  {/* Obiettivi palestra */}
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Obiettivi</label>
                    <div className="flex flex-wrap gap-1.5">
                      {OBIETTIVI_PALESTRA.map((ob) => {
                        const sel = (form.obiettiviPalestra ?? []).includes(ob);
                        return (
                          <button key={ob} type="button"
                            onClick={() => {
                              const cur = form.obiettiviPalestra ?? [];
                              setForm({ ...form, obiettiviPalestra: sel ? cur.filter(x => x !== ob) : [...cur, ob] });
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                              sel ? "bg-[#C8102E] text-white border-[#C8102E]" : "bg-white text-gray-500 border-gray-200 hover:border-[#C8102E] hover:text-[#C8102E]"
                            }`}>
                            {ob}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Esercizi in Palestra</label>
                    <button onClick={aggiungiEs} className="text-[#C8102E] text-xs font-semibold hover:underline">+ Aggiungi</button>
                  </div>
                  <div className="space-y-3">
                    {form.esercizi.map((es, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2.5">
                        {/* Nome + cestino */}
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">{i + 1}</span>
                          <input value={es.nome} onChange={(e) => aggiornaEs(i, "nome", e.target.value)}
                            placeholder="Nome esercizio"
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                          <button onClick={() => rimuoviEs(i)} className="text-gray-300 hover:text-red-400 shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Metriche: 4 colonne compatte */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {([ ["Serie", "serie"], ["Reps", "reps"], ["Carico", "carico"], ["RIR", "rir"] ] as const).map(([label, key]) => (
                            <div key={key}>
                              <p className="text-[10px] text-gray-400 mb-0.5 text-center">{label}</p>
                              <input value={es[key]} onChange={(e) => aggiornaEs(i, key, e.target.value)} placeholder="—"
                                className="w-full bg-white border border-gray-200 rounded-lg px-1.5 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                            </div>
                          ))}
                        </div>
                        {/* VAS */}
                        <ScaleInput label={`VAS: ${es.vas || 0}/10`} value={es.vas} max={10} onChange={(v) => aggiornaEs(i, "vas", v)} color="text-red-500" />
                        {/* Note */}
                        <input value={es.note} onChange={(e) => aggiornaEs(i, "note", e.target.value)} placeholder="Note"
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                      </div>
                    ))}
                  </div>

                  {/* RPE sessione */}
                  <div className="mt-4 bg-orange-50 border border-orange-100 rounded-xl p-4">
                    <ScaleInput
                      label={`RPE sessione: ${carico.rpe || 0}/10`}
                      value={carico.rpe}
                      max={10}
                      onChange={(v) => aggiornaCarico("rpe", v)}
                      color="text-orange-500"
                    />
                    <p className="text-xs text-orange-400 mt-2">Valutazione dello sforzo percepito a fine seduta</p>
                  </div>
                </div>
              )}

              {/* Sezione Campo */}
              {sezioneAttiva === "campo" && (
                <div>
                  {/* Obiettivi campo */}
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Obiettivi</label>
                    <div className="flex flex-wrap gap-1.5">
                      {OBIETTIVI_CAMPO.map((ob) => {
                        const sel = (form.obiettiviCampo ?? []).includes(ob);
                        return (
                          <button key={ob} type="button"
                            onClick={() => {
                              const cur = form.obiettiviCampo ?? [];
                              setForm({ ...form, obiettiviCampo: sel ? cur.filter(x => x !== ob) : [...cur, ob] });
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                              sel ? "bg-[#C8102E] text-white border-[#C8102E]" : "bg-white text-gray-500 border-gray-200 hover:border-[#C8102E] hover:text-[#C8102E]"
                            }`}>
                            {ob}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Esercizi in campo</label>
                    <button onClick={aggiungiCampo} className="text-[#C8102E] text-xs font-semibold hover:underline">+ Aggiungi</button>
                  </div>
                  {esercizicampo.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      <Footprints className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      Nessun esercizio in campo. Clicca "+ Aggiungi" per inserirne uno.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {esercizicampo.map((c, i) => {
                        const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white";
                        return (
                          <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">{i + 1}</span>
                              <input value={c.tipo} onChange={(e) => aggiornaCampo(i, "tipo", e.target.value)}
                                placeholder="Nome esercizio (es. Sprint, RSA, Metabolico...)"
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white" />
                              <button onClick={() => rimuoviCampo(i)} className="text-gray-300 hover:text-red-400 shrink-0">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Serie</p>
                                <input value={c.serie} onChange={(e) => aggiornaCampo(i, "serie", e.target.value)} placeholder="Es. 4" className={inp} />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Durata</p>
                                <input value={c.durata} onChange={(e) => aggiornaCampo(i, "durata", e.target.value)} placeholder="Es. 30'' / 5'" className={inp} />
                              </div>
                            </div>
                            <ScaleInput label={`VAS: ${c.vas || 0}/10`} value={c.vas} max={10} onChange={(v) => aggiornaCampo(i, "vas", v)} color="text-red-500" />
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Descrizione</p>
                              <input value={c.descrizione} onChange={(e) => aggiornaCampo(i, "descrizione", e.target.value)}
                                placeholder="Es. 3×10'' lavoro a 90% VMax con recupero 30''" className={inp} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sezione Test */}
              {sezioneAttiva === "test" && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Test fisioterapici e di performance</label>
                    <button onClick={aggiungiTest} className="text-[#C8102E] text-xs font-semibold hover:underline">+ Aggiungi test</button>
                  </div>
                  {tests.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      <FlaskConical className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      Nessun test. Clicca "+ Aggiungi test" per inserire risultati.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tests.map((t, i) => {
                        const isDropJump   = t.nome === "Drop Jump";
                        const isSLDropJump = t.nome === "SL Drop Jump";
                        const isPersonalizzato = t.nome === "Personalizzato";
                        const asim = isSLDropJump
                          ? calcolaAsimmetria(t.rsiSx ?? "", t.rsiDx ?? "")
                          : calcolaAsimmetria(t.risultatoSx, t.risultatoDx);
                        const formSup = isSLDropJump
                          ? superioreTest(t.rsiSx ?? "", t.rsiDx ?? "")
                          : superioreTest(t.risultatoSx, t.risultatoDx);
                        const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white";
                        return (
                          <div key={i} className={`rounded-xl p-4 space-y-3 ${asim !== null && asim > 10 ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">{i + 1}</span>
                              <select value={t.nome} onChange={(e) => aggiornaTest(i, "nome", e.target.value)}
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white">
                                <option value="">Seleziona test...</option>
                                {[...TESTS_PREDEFINITI]
                  .sort((a, b) => a === "Personalizzato" ? 1 : b === "Personalizzato" ? -1 : a.localeCompare(b, "it", { sensitivity: "base" }))
                  .map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                              </select>
                              <button onClick={() => rimuoviTest(i)} className="text-gray-300 hover:text-red-400 shrink-0">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {isPersonalizzato && (
                              <input value={t.risultato} onChange={(e) => aggiornaTest(i, "risultato", e.target.value)}
                                placeholder="Nome test personalizzato" className={inp} />
                            )}

                            {isDropJump && (
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Altezza salto (cm)</p>
                                  <input value={t.altezzaSalto ?? ""} onChange={(e) => aggiornaTest(i, "altezzaSalto", e.target.value)} placeholder="es. 32" className={inp} />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Tempo contatto (ms)</p>
                                  <input value={t.tempoContatto ?? ""} onChange={(e) => aggiornaTest(i, "tempoContatto", e.target.value)} placeholder="es. 210" className={inp} />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">RSI</p>
                                  <input value={t.rsi ?? ""} onChange={(e) => aggiornaTest(i, "rsi", e.target.value)} placeholder="es. 1.52" className={inp} />
                                </div>
                              </div>
                            )}

                            {isSLDropJump && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-3">
                                  {/* Sx */}
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Arto Sx</p>
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Altezza salto (cm)</p>
                                      <input value={t.altezzaSaltoSx ?? ""} onChange={(e) => aggiornaTest(i, "altezzaSaltoSx", e.target.value)} placeholder="es. 30" className={inp} />
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Tempo contatto (ms)</p>
                                      <input value={t.tempoContattoSx ?? ""} onChange={(e) => aggiornaTest(i, "tempoContattoSx", e.target.value)} placeholder="es. 220" className={inp} />
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">RSI</p>
                                      <input value={t.rsiSx ?? ""} onChange={(e) => aggiornaTest(i, "rsiSx", e.target.value)} placeholder="es. 1.36" className={inp} />
                                    </div>
                                  </div>
                                  {/* Dx */}
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Arto Dx</p>
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Altezza salto (cm)</p>
                                      <input value={t.altezzaSaltoDx ?? ""} onChange={(e) => aggiornaTest(i, "altezzaSaltoDx", e.target.value)} placeholder="es. 32" className={inp} />
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Tempo contatto (ms)</p>
                                      <input value={t.tempoContattoDx ?? ""} onChange={(e) => aggiornaTest(i, "tempoContattoDx", e.target.value)} placeholder="es. 210" className={inp} />
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">RSI</p>
                                      <input value={t.rsiDx ?? ""} onChange={(e) => aggiornaTest(i, "rsiDx", e.target.value)} placeholder="es. 1.52" className={inp} />
                                    </div>
                                  </div>
                                </div>
                                {asim !== null && formSup !== null && (
                                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${asim > 10 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                    {asim > 10 && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                                    RSI: {formSup} superiore del {asim.toFixed(1)}%{asim > 10 ? " — attenzione!" : " — nella norma"}
                                  </div>
                                )}
                              </div>
                            )}

                            {!isDropJump && !isSLDropJump && !isPersonalizzato && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Arto Sx</p>
                                    <input value={t.risultatoSx} onChange={(e) => aggiornaTest(i, "risultatoSx", e.target.value)} placeholder="es. 85" className={inp} />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Arto Dx</p>
                                    <input value={t.risultatoDx} onChange={(e) => aggiornaTest(i, "risultatoDx", e.target.value)} placeholder="es. 92" className={inp} />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Unità</p>
                                    <input value={t.unita} onChange={(e) => aggiornaTest(i, "unita", e.target.value)} placeholder="cm / Nm / %" className={inp} />
                                  </div>
                                </div>
                                {asim !== null && formSup !== null && (
                                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${asim > 10 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                    {asim > 10 && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                                    {formSup} superiore del {asim.toFixed(1)}%{asim > 10 ? " — attenzione!" : " — nella norma"}
                                  </div>
                                )}
                              </div>
                            )}

                            <input value={t.note} onChange={(e) => aggiornaTest(i, "note", e.target.value)}
                              placeholder="Note aggiuntive" className={inp} />
                          </div>
                        );
                      })}
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

                  {/* Riga 1 — sessione */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Durata (min)</label>
                      <input value={carico.durata} onChange={(e) => aggiornaCarico("durata", e.target.value)}
                        placeholder="Es. 75"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">RPE (/10)</label>
                      <input value={carico.rpe} onChange={(e) => aggiornaCarico("rpe", e.target.value)}
                        placeholder="Es. 6"
                        type="number" min="1" max="10"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Training Load</label>
                      <input value={carico.interno}
                        readOnly
                        placeholder="RPE × min"
                        className="mt-1 w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                    </div>
                  </div>

                  {/* Riga 2 — distanza e velocità */}
                  <div className="grid grid-cols-2 gap-3">
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
                  </div>

                  {/* Riga 3 — zone di velocità */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vel. &gt;18 km/h (m)</label>
                      <input value={carico.hsr} onChange={(e) => aggiornaCarico("hsr", e.target.value)}
                        placeholder="Es. 350"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vel. &gt;21 km/h (m)</label>
                      <input value={carico.velocita21 ?? ""} onChange={(e) => aggiornaCarico("velocita21", e.target.value)}
                        placeholder="Es. 280"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vel. &gt;25 km/h (m)</label>
                      <input value={carico.velocita25 ?? ""} onChange={(e) => aggiornaCarico("velocita25", e.target.value)}
                        placeholder="Es. 120"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                  </div>

                  {/* Riga 4 — acc/dec */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accelerazioni (≥3 m/s²)</label>
                      <input value={carico.accelerazioni} onChange={(e) => aggiornaCarico("accelerazioni", e.target.value)}
                        placeholder="Es. 42"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Decelerazioni (≤-3 m/s²)</label>
                      <input value={carico.decelerazioni ?? ""} onChange={(e) => aggiornaCarico("decelerazioni", e.target.value)}
                        placeholder="Es. 38"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                    </div>
                  </div>

                  {/* Riga 5 — sprint */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Numero di sprint</label>
                    <input value={carico.sprint ?? ""} onChange={(e) => aggiornaCarico("sprint", e.target.value)}
                      placeholder="Es. 12"
                      className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Note GPS</label>
                    <input value={carico.note} onChange={(e) => aggiornaCarico("note", e.target.value)}
                      placeholder="Note aggiuntive"
                      className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
                  </div>
                </div>
              )}
              </>}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setMostraForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
                Annulla
              </button>
              <button onClick={salvaProgramma} disabled={!form.atletaId || (!form.assente && !form.riposo && !form.squadra && !form.nome.trim())}
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

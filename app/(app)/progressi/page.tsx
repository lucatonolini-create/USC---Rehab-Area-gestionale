"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Download, Calendar, Filter } from "lucide-react";
import {
  loadAtleti, loadProgrammi, upsertAtleta, uid, nd,
  CATEGORIE, type Atleta, type Stato, type Programma, type InfortunioStorico,
} from "@/lib/store";

const MESI_BREVI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const CAT_PALETTE = ["#C8102E","#1E40AF","#047857","#B45309","#7C3AED","#0E7490","#BE185D","#374151"];
const TIPO_PALETTE = ["#374151","#6B7280","#B45309","#1E40AF","#7C3AED","#0E7490","#047857","#BE185D"];

const STATI: Stato[] = ["Infortunato", "Disponibile"];
const statoColor: Record<Stato, string> = {
  "Infortunato": "bg-orange-100 text-orange-700",
  "Disponibile": "bg-green-100 text-green-700",
};

function csvDownload(rows: string[][], filename: string) {
  const content = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function esportaCSV(atleta: Atleta, programmi: Programma[]) {
  const fmt = (d?: string) => d ? new Date(d + "T12:00").toLocaleDateString("it-IT") : "—";
  const rows: string[][] = [];

  rows.push(["DATI PERSONALI"]);
  rows.push(["Nome", nd(atleta)]);
  rows.push(["Categoria", atleta.categoria ?? "—"]);
  rows.push(["Ruolo", atleta.posizione ?? "—"]);
  rows.push(["Piede dominante", atleta.piedeDominante ?? "—"]);
  rows.push(["Infortunio", atleta.infortunio || "—"]);
  rows.push(["Inizio riabilitazione", fmt(atleta.inizioRehab)]);
  rows.push(["Fine riabilitazione", fmt(atleta.fineRehab)]);
  rows.push(["Stato attuale", atleta.stato]);
  rows.push(["Progresso recupero", `${atleta.progresso}%`]);
  if (atleta.note) rows.push(["Note", atleta.note]);
  rows.push([]);

  if (programmi.length > 0) {
    rows.push(["SESSIONI DI LAVORO"]);
    rows.push(["Data", "Programma", "Fase", "Tipo", "#", "Esercizio/Descrizione", "Serie", "Reps/Durata", "Carico", "RIR", "VAS", "Note"]);
    programmi.forEach(prog => {
      const dataProg = prog.data ? new Date(prog.data + "T12:00").toLocaleDateString("it-IT") : "—";
      prog.esercizi.forEach((e, i) => {
        rows.push([dataProg, prog.nome ?? "—", prog.fase ?? "—", "Palestra", String(i + 1), e.nome, e.serie ?? "—", e.reps ?? "—", e.carico ?? "—", e.rir ?? "—", e.vas ? `${e.vas}/10` : "—", e.note ?? ""]);
      });
      (prog.esercizicampo ?? []).forEach((c, i) => {
        rows.push([dataProg, prog.nome ?? "—", prog.fase ?? "—", "Campo", String(i + 1), c.descrizione ?? c.tipo ?? "—", c.serie ?? "—", c.durata ?? "—", "", "", "", ""]);
      });
      if (prog.tests?.length) {
        prog.tests.forEach((t, i) => {
          rows.push([dataProg, prog.nome ?? "—", prog.fase ?? "—", "Test", String(i + 1), t.nome, "", t.risultato ? `${t.risultato} ${t.unita ?? ""}`.trim() : "—", "", "", "", t.note ?? ""]);
        });
      }
    });
  }

  csvDownload(rows, `${nd(atleta).replace(/ /g, "_")}_rehab.csv`);
}

function esportaCSVReportMensile(
  atletiMese: Atleta[], mese: number, anno: number, filtroCat: string,
  mesiP?: { anno: number; mese: number }[], periodoLbl?: string
) {
  const nomeP = periodoLbl ?? `${MESI[mese]} ${anno}`;
  const fmt = (d: string) => new Date(d + "T12:00").toLocaleDateString("it-IT");
  const gg = (inizio: string, fine?: string) => fine
    ? String(Math.round((new Date(fine + "T12:00").getTime() - new Date(inizio + "T12:00").getTime()) / 86400000))
    : "—";

  const rows: string[][] = [];
  rows.push([`U.S. CREMONESE – REHAB AREA – Report ${nomeP}${filtroCat !== "Tutte" ? ` – ${filtroCat}` : ""}`]);
  rows.push([]);
  rows.push(["Nome", "Categoria", "Infortunio", "Tipo", "Inizio", "Fine", "Giorni", "Stato", "Progresso"]);

  atletiMese.forEach(a => {
    const infortuni = infortunitNelPeriodo(a, mesiP ?? [{ anno, mese }]);
    if (infortuni.length === 0) {
      rows.push([nd(a), a.categoria ?? "—", "—", "—", "—", "—", "—", a.stato, `${a.progresso}%`]);
    } else {
      infortuni.forEach(inf => {
        rows.push([nd(a), a.categoria ?? "—", inf.diagnosi, inf.tipo ?? "—", inf.inizio ? fmt(inf.inizio) : "—", inf.fine ? fmt(inf.fine) : "—", inf.inizio ? gg(inf.inizio, inf.fine) : "—", a.stato, `${a.progresso}%`]);
      });
    }
  });

  rows.push([]);
  rows.push(["RIEPILOGO PER CATEGORIA"]);
  rows.push(["Categoria", "N. atleti"]);
  CATEGORIE.forEach(cat => {
    const n = atletiMese.filter(a => a.categoria === cat).length;
    if (n) rows.push([cat, String(n)]);
  });
  rows.push(["TOTALE", String(atletiMese.length)]);

  csvDownload(rows, `USC_Report_${nomeP.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
}

type PageTab = "progressi" | "report";
type TipoReport = "mensile" | "trimestrale" | "semestrale" | "annuale" | "stagione";

const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

function atletaAttivoInMese(a: Atleta, anno: number, mese: number): boolean {
  const meseStart = new Date(anno, mese, 1);
  const meseEnd = new Date(anno, mese + 1, 0);
  const periodoAttivo = (inizioStr?: string, fineStr?: string): boolean => {
    if (!inizioStr) return false;
    const inizio = new Date(inizioStr + "T12:00");
    if (inizio > meseEnd) return false; // not yet started this month
    if (fineStr) return new Date(fineStr + "T12:00") >= meseStart;
    return true; // still ongoing
  };
  // Infortunio attivo corrente
  if (periodoAttivo(a.inizioRehab, a.fineRehab)) return true;
  // Infortuni passati archiviati (atleta guarito): contano nei mesi in cui si è svolta la riabilitazione
  return (a.storicoInfortuni ?? []).some((s) => periodoAttivo(s.inizioRehab, s.fineRehab));
}

type InfortunioNelMese = { diagnosi: string; tipo?: string; inizio: string; fine?: string };
function infortunitNelMese(a: Atleta, anno: number, mese: number): InfortunioNelMese[] {
  const meseStart = new Date(anno, mese, 1);
  const meseEnd = new Date(anno, mese + 1, 0);
  const inMese = (inizioStr?: string, fineStr?: string): boolean => {
    if (!inizioStr) return false;
    const inizio = new Date(inizioStr + "T12:00");
    if (inizio > meseEnd) return false;
    if (fineStr) return new Date(fineStr + "T12:00") >= meseStart;
    return true;
  };
  const result: InfortunioNelMese[] = [];
  if (inMese(a.inizioRehab, a.fineRehab) && a.infortunio)
    result.push({ diagnosi: a.infortunio, tipo: a.tipoInfortunio, inizio: a.inizioRehab, fine: a.fineRehab });
  (a.storicoInfortuni ?? []).forEach((s) => {
    if (inMese(s.inizioRehab, s.fineRehab))
      result.push({ diagnosi: s.diagnosi, tipo: s.tipo, inizio: s.inizioRehab, fine: s.fineRehab });
  });
  return result;
}

function infortunitNelPeriodo(a: Atleta, mesi: { anno: number; mese: number }[]): InfortunioNelMese[] {
  const seen = new Set<string>();
  const result: InfortunioNelMese[] = [];
  for (const { anno, mese } of mesi)
    infortunitNelMese(a, anno, mese).forEach((inf) => {
      const key = `${inf.diagnosi}|${inf.inizio ?? ""}`;
      if (!seen.has(key)) { seen.add(key); result.push(inf); }
    });
  return result;
}

export default function ProgressiPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [programmi, setProgrammi] = useState<Programma[]>([]);
  const [esportando, setEsportando] = useState<string | null>(null);
  const [esportandoReport, setEsportandoReport] = useState(false);
  const [pageTab, setPageTab] = useState<PageTab>("progressi");

  const oggi = new Date();
  const [reportAnno, setReportAnno] = useState(oggi.getFullYear());
  const [reportMese, setReportMese] = useState(oggi.getMonth());
  const [filtroCat, setFiltroCat] = useState("Tutte");
  const [filtroInf, setFiltroInf] = useState("");
  const [tipoReport, setTipoReport] = useState<TipoReport>("mensile");
  const [stagioneMeseInizio, setStagioneMeseInizio] = useState(6);
  const [stagioneMeseFine, setStagioneMeseFine] = useState(5);

  useEffect(() => {
    loadAtleti().then(setAtleti);
    loadProgrammi().then(setProgrammi);
  }, []);

  const mesiPeriodo: { anno: number; mese: number }[] = (() => {
    if (tipoReport === "mensile") return [{ anno: reportAnno, mese: reportMese }];
    const mesi: { anno: number; mese: number }[] = [];
    const crossYear = stagioneMeseInizio > stagioneMeseFine;
    const annoStart = crossYear ? reportAnno - 1 : reportAnno;
    let m = stagioneMeseInizio;
    let a = annoStart;
    while (mesi.length < 24) {
      mesi.push({ anno: a, mese: m });
      if (m === stagioneMeseFine && a === reportAnno) break;
      m = (m + 1) % 12;
      if (m === 0) a++;
    }
    return mesi;
  })();

  const periodoLabel = (() => {
    if (tipoReport === "mensile") return `${MESI[reportMese]} ${reportAnno}`;
    const first = mesiPeriodo[0];
    const last = mesiPeriodo[mesiPeriodo.length - 1];
    const annoLbl = first.anno === last.anno ? `${first.anno}` : `${first.anno}–${last.anno}`;
    const tipoLbl = tipoReport === "trimestrale" ? "Trimestre" : tipoReport === "semestrale" ? "Semestre" : tipoReport === "annuale" ? "Anno" : "Stagione";
    return `${tipoLbl} ${MESI[first.mese]}–${MESI[last.mese]} ${annoLbl}`;
  })();

  const aggiorna = (id: string, campo: keyof Atleta, valore: string | number) => {
    let updatedAtleta: Atleta | undefined;
    const nuovi = atleti.map((a) => {
      if (a.id !== id) return a;
      const updated: Atleta = { ...a, [campo]: valore };
      if (campo === "stato" && valore === "Disponibile") {
        const fineRehab = a.fineRehab ?? new Date().toISOString().slice(0, 10);
        updated.fineRehab = fineRehab;
        // Archivia l'infortunio corrente se presente
        if (a.infortunio || a.inizioRehab) {
          const inf: InfortunioStorico = {
            id: uid(),
            tipo: a.tipoInfortunio,
            diagnosi: a.infortunio || "—",
            inizioRehab: a.inizioRehab,
            fineRehab,
            note: a.note || undefined,
          };
          updated.storicoInfortuni = [...(a.storicoInfortuni ?? []), inf];
        }
        // Pulisce i campi dell'infortunio attivo
        updated.infortunio = "";
        updated.tipoInfortunio = undefined;
        updated.inizioRehab = "";
        updated.fineRehab = undefined;
        updated.progresso = 100;
      }
      updatedAtleta = updated;
      return updated;
    });
    setAtleti(nuovi);
    if (updatedAtleta) upsertAtleta(updatedAtleta);
  };

  const handleExport = (atleta: Atleta) => {
    setEsportando(atleta.id);
    const prog = programmi.filter((p) => p.atletaId === atleta.id);
    try {
      esportaCSV(atleta, prog);
    } finally {
      setEsportando(null);
    }
  };

  // Report periodo
  const atletiMese = atleti.filter((a) => {
    if (!mesiPeriodo.some(({ anno, mese }) => atletaAttivoInMese(a, anno, mese))) return false;
    if (filtroCat !== "Tutte" && a.categoria !== filtroCat) return false;
    if (filtroInf) {
      const q = filtroInf.toLowerCase();
      const inLive = (a.infortunio ?? "").toLowerCase().includes(q);
      const inStorico = (a.storicoInfortuni ?? []).some(
        (s) => s.diagnosi.toLowerCase().includes(q) || (s.tipo ?? "").toLowerCase().includes(q)
      );
      if (!inLive && !inStorico) return false;
    }
    return true;
  });

  const anni = Array.from({ length: 5 }, (_, i) => oggi.getFullYear() - 2 + i);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Progressi</h1>
          <p className="text-gray-500 mt-1">Aggiorna e scarica la scheda riabilitativa</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(["progressi", "report"] as PageTab[]).map((t) => (
            <button key={t} onClick={() => setPageTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                pageTab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              {t === "progressi" ? "Progressi" : "Report"}
            </button>
          ))}
        </div>
      </div>

      {pageTab === "progressi" ? (
        atleti.length === 0 ? (
          <div className="text-center py-20">
            <TrendingUp className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">Nessun atleta ancora</p>
          </div>
        ) : (
          <div className="space-y-4">
            {atleti.map((atleta) => {
              const nProg = programmi.filter((p) => p.atletaId === atleta.id).length;
              return (
                <div key={atleta.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {nd(atleta).trim().split(/\s+/).filter(Boolean).slice(0,2).map((w:string)=>(w[0]??"").toUpperCase()).join("")}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{nd(atleta)}</h3>
                        <p className="text-sm text-gray-500 truncate">
                          {atleta.categoria}{atleta.posizione ? ` · ${atleta.posizione}` : ""}
                          {nProg > 0 ? ` · ${nProg} programm${nProg === 1 ? "a" : "i"}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleExport(atleta)} disabled={!!esportando}
                        className="flex items-center gap-1.5 border border-green-300 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-50 disabled:opacity-50">
                        <Download className="w-3.5 h-3.5" />
                        {esportando === atleta.id ? "..." : "CSV"}
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Stato</label>
                    <div className="flex flex-wrap gap-2">
                      {STATI.map((s) => (
                        <button key={s} onClick={() => aggiorna(atleta.id, "stato", s)}
                          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                            atleta.stato === s ? statoColor[s] + " ring-2 ring-offset-1 ring-current" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    {atleta.stato === "Disponibile" && atleta.fineRehab && (
                      <p className="text-xs text-gray-400 mt-1">
                        Fine riab.: {new Date(atleta.fineRehab + "T12:00").toLocaleDateString("it-IT")}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-600">Progresso recupero</label>
                      <span className="text-2xl font-bold text-[#C8102E]">{atleta.progresso}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={atleta.progresso}
                      onChange={(e) => aggiorna(atleta.id, "progresso", Number(e.target.value))}
                      className="w-full accent-[#C8102E] h-2" />
                    <div className="flex justify-between text-xs text-gray-300 mt-1">
                      {["0%", "25%", "50%", "75%", "100%"].map((v) => <span key={v}>{v}</span>)}
                    </div>
                  </div>

                  {atleta.infortunio && (
                    <p className="text-xs text-gray-400 mt-3">{atleta.infortunio}</p>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Report mensile */
        <div className="space-y-5">
          {/* Filtri */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-[#C8102E]" />
              <h2 className="font-bold text-gray-900">Seleziona periodo e filtri</h2>
            </div>
            {/* Tipo report */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(["mensile", "trimestrale", "semestrale", "annuale", "stagione"] as TipoReport[]).map((t) => (
                <button key={t} onClick={() => setTipoReport(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    tipoReport === t ? "bg-[#C8102E] text-white border-[#C8102E]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}>
                  {t === "mensile" ? "Mensile" : t === "trimestrale" ? "Trimestrale" : t === "semestrale" ? "Semestrale" : t === "annuale" ? "Annuale" : "Fine stagione"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tipoReport === "mensile" && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mese</label>
                  <select value={reportMese} onChange={(e) => setReportMese(Number(e.target.value))}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
                    {MESI.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                </div>
              )}
              {tipoReport !== "mensile" && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mese inizio</label>
                    <select value={stagioneMeseInizio} onChange={(e) => setStagioneMeseInizio(Number(e.target.value))}
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
                      {MESI.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mese fine</label>
                    <select value={stagioneMeseFine} onChange={(e) => setStagioneMeseFine(Number(e.target.value))}
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
                      {MESI.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {tipoReport !== "mensile" && stagioneMeseInizio > stagioneMeseFine ? "Anno fine" : "Anno"}
                </label>
                <select value={reportAnno} onChange={(e) => setReportAnno(Number(e.target.value))}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
                  {anni.map((a) => <option key={a} value={a}>{tipoReport !== "mensile" && stagioneMeseInizio > stagioneMeseFine ? `${a - 1}–${a}` : a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</label>
                <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
                  <option>Tutte</option>
                  {CATEGORIE.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo infortunio</label>
                <input value={filtroInf} onChange={(e) => setFiltroInf(e.target.value)}
                  placeholder="Es. LCA, menisco…"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
              </div>
            </div>
          </div>

          {/* Risultati */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-bold text-gray-900">
                {periodoLabel}
                {filtroCat !== "Tutte" && ` · ${filtroCat}`}
                <span className="ml-2 text-sm font-bold text-[#C8102E]">{atletiMese.length} atleti</span>
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEsportandoReport(true); try { esportaCSVReportMensile(atletiMese, reportMese, reportAnno, filtroCat, mesiPeriodo, periodoLabel); } finally { setEsportandoReport(false); } }}
                  disabled={esportandoReport || atletiMese.length === 0}
                  className="flex items-center gap-1.5 border border-green-300 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-50 disabled:opacity-50">
                  <Download className="w-3.5 h-3.5" />
                  {esportandoReport ? "..." : "CSV"}
                </button>
              </div>
            </div>

            {atletiMese.length === 0 ? (
              <div className="py-12 text-center">
                <Filter className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nessun atleta con percorso riabilitativo in questo periodo</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {/* Raggruppamento per categoria */}
                {CATEGORIE.map((cat) => {
                  const lista = atletiMese.filter((a) => a.categoria === cat);
                  if (!lista.length) return null;
                  return (
                    <div key={cat}>
                      <div className="px-5 py-2 bg-gray-50 flex items-center gap-2">
                        <span className="text-xs font-bold text-[#C8102E] uppercase tracking-widest">{cat}</span>
                        <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">{lista.length}</span>
                      </div>
                      {lista.map((a) => {
                        const tuttiInf = infortunitNelPeriodo(a, mesiPeriodo);
                        const infortuni = filtroInf
                          ? tuttiInf.filter((inf) => {
                              const q = filtroInf.toLowerCase();
                              return inf.diagnosi.toLowerCase().includes(q) || (inf.tipo ?? "").toLowerCase().includes(q);
                            })
                          : tuttiInf;
                        const fmtD = (d: string) => new Date(d + "T12:00").toLocaleDateString("it-IT");
                        return (
                        <div key={a.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50">
                          <div className="w-9 h-9 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                            {nd(a).trim().split(/\s+/).filter(Boolean).slice(0,2).map((w:string)=>(w[0]??"").toUpperCase()).join("")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{nd(a)}</p>
                            <div className="space-y-1.5 mt-1">
                              {infortuni.length === 0 ? (
                                <p className="text-xs text-gray-400">—</p>
                              ) : (
                                infortuni.map((inf, i) => (
                                  <div key={i}>
                                    <p className="text-sm text-gray-700 font-medium leading-snug">{inf.diagnosi}</p>
                                    <p className="text-xs text-gray-400">
                                      {inf.tipo ? `${inf.tipo} · ` : ""}
                                      {inf.inizio ? fmtD(inf.inizio) : ""}
                                      {inf.fine ? ` → ${fmtD(inf.fine)}` : ""}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statoColor[a.stato]}`}>
                              {a.stato}
                            </span>
                          </div>
                          <div className="w-16 text-right shrink-0">
                            <span className="text-lg font-bold text-[#C8102E]">{a.progresso}%</span>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

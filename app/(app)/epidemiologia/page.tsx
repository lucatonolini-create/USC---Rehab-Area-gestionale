"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Download, Clock, Shield, RotateCcw, FileText } from "lucide-react";
import { loadAtleti, loadProgrammi, nd, CATEGORIE, type Atleta, type Programma } from "@/lib/store";

// ── Types ─────────────────────────────────────────────────────────────────────
interface EpiInf {
  atletaId: string;
  nomeAtleta: string;
  categoria: string;
  tipoInfortunio: string;
  posizione: string;
  lato: string;
  evento: string;
  meccanismo: string;
  inizioRehab: string;
  fineRehab?: string;
  giorni: number;
  severita: "Minima" | "Lieve" | "Moderata" | "Grave";
  reInf: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MESI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const SEV_COLOR: Record<string, string> = {
  Minima: "#22C55E", Lieve: "#F59E0B", Moderata: "#F97316", Grave: "#C8102E",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcolaGiorni(inizio: string, fine?: string) {
  const s = new Date(inizio + "T12:00").getTime();
  const e = fine ? new Date(fine + "T12:00").getTime() : Date.now();
  return Math.max(1, Math.round((e - s) / 86400000));
}

function classificaSeverita(giorni: number): EpiInf["severita"] {
  if (giorni <= 3) return "Minima";
  if (giorni <= 7) return "Lieve";
  if (giorni <= 28) return "Moderata";
  return "Grave";
}

function estraiTutti(atleti: Atleta[]): EpiInf[] {
  const list: EpiInf[] = [];
  for (const a of atleti) {
    const tipiVisti = new Set<string>();
    for (const s of a.storicoInfortuni ?? []) {
      if (!s.inizioRehab) continue;
      const gg = calcolaGiorni(s.inizioRehab, s.fineRehab);
      const t = s.tipo ?? "—";
      list.push({
        atletaId: a.id, nomeAtleta: nd(a), categoria: a.categoria ?? "—",
        tipoInfortunio: t, posizione: "—", lato: "—", evento: "—", meccanismo: "—",
        inizioRehab: s.inizioRehab, fineRehab: s.fineRehab,
        giorni: gg, severita: classificaSeverita(gg), reInf: tipiVisti.has(t),
      });
      tipiVisti.add(t);
    }
    if (a.inizioRehab) {
      const gg = calcolaGiorni(a.inizioRehab, a.fineRehab);
      const t = a.tipoInfortunio ?? "—";
      list.push({
        atletaId: a.id, nomeAtleta: nd(a), categoria: a.categoria ?? "—",
        tipoInfortunio: t, posizione: a.posizioneInfortunio ?? "—",
        lato: a.lato ?? "—", evento: a.evento ?? "—", meccanismo: a.meccanismo ?? "—",
        inizioRehab: a.inizioRehab, fineRehab: a.fineRehab,
        giorni: gg, severita: classificaSeverita(gg), reInf: tipiVisti.has(t),
      });
    }
  }
  return list.sort((a, b) => a.inizioRehab.localeCompare(b.inizioRehab));
}

function contaMap(items: string[]): Map<string, number> {
  const m = new Map<string, number>();
  items.forEach(v => m.set(v, (m.get(v) ?? 0) + 1));
  return m;
}

async function esportaPDFEpi(params: {
  filtroCat: string; filtroAnno: string;
  totEpisodi: number; totGiorni: number; mediaGiorni: number; reRate: number;
  sevCount: Record<string, number>;
  tipoRows: [string, number][]; posRows: [string, number][]; catRows: [string, number][];
  eventoRows: [string, number][]; latoRows: [string, number][]; mechRows: [string, number][];
  burdenRows: [string, number][]; monthCounts: number[];
}) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  const red: [number, number, number] = [200, 16, 46];
  const dark: [number, number, number] = [43, 43, 43];
  const gray: [number, number, number] = [130, 130, 130];
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const HDR = 22;

  function addHeader() {
    doc.setFillColor(...red); doc.rect(0, 0, W, HDR, "F");
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    doc.text("U.S. Cremonese – Epidemiologia Infortuni", 14, 14);
    const sub = [params.filtroCat !== "Tutte" ? params.filtroCat : "Tutte le categorie", params.filtroAnno !== "Tutti" ? params.filtroAnno : "Tutti gli anni"].join("  •  ");
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.text(sub, W - 14, 14, { align: "right" });
    doc.setTextColor(...dark);
  }

  function secTitle(title: string, y: number) {
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...gray);
    doc.text(title.toUpperCase(), 14, y);
    doc.setDrawColor(...gray); doc.setLineWidth(0.3);
    doc.line(14, y + 1.5, W - 14, y + 1.5);
    doc.setTextColor(...dark);
    return y + 8;
  }

  addHeader();
  let y = HDR + 10;

  // KPI row
  y = secTitle("Riepilogo", y);
  autoTable(doc, {
    startY: y,
    body: [
      ["Episodi totali", String(params.totEpisodi), "Giorni persi totali", String(params.totGiorni)],
      ["Durata media", `${params.mediaGiorni} gg`, "Tasso re-infortunio", `${params.reRate}%`],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3, halign: "left", valign: "middle" },
    columnStyles: {
      0: { fontStyle: "bold", textColor: gray, cellWidth: 45 },
      1: { cellWidth: 35 },
      2: { fontStyle: "bold", textColor: gray, cellWidth: 45 },
      3: { cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Severity
  y = secTitle("Distribuzione Severità (UEFA)", y);
  const sevLabels: Record<string, string> = { Minima: "1–3 gg", Lieve: "4–7 gg", Moderata: "8–28 gg", Grave: "> 28 gg" };
  autoTable(doc, {
    startY: y,
    head: [["Livello", "N°", "Soglia", "%"]],
    body: (["Minima","Lieve","Moderata","Grave"] as const).map(s => [
      s, params.sevCount[s] ?? 0, sevLabels[s],
      params.totEpisodi > 0 ? `${Math.round(((params.sevCount[s] ?? 0) / params.totEpisodi) * 100)}%` : "—",
    ]),
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 2.5, halign: "left", valign: "middle" },
    columnStyles: { 0: { fontStyle: "bold", textColor: dark }, 1: { halign: "center" }, 3: { halign: "center" } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Two-column tables
  const midW = (W - 14 - 14 - 6) / 2;
  const colL = 14;
  const colR = 14 + midW + 6;

  function miniTable(title: string, rows: [string, number][], x: number, startY: number, labelW: number, color: string): number {
    const [r, g, b] = color.match(/\d+/g)!.map(Number) as [number, number, number];
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...(gray as [number,number,number]));
    doc.text(title.toUpperCase(), x, startY);
    doc.setDrawColor(...(gray as [number,number,number])); doc.setLineWidth(0.25);
    doc.line(x, startY + 1, x + midW, startY + 1);
    doc.setTextColor(...(dark as [number,number,number]));
    autoTable(doc, {
      startY: startY + 5,
      head: [["Tipo", "N°"]],
      body: rows.map(([k, n]) => [k, n]),
      theme: "striped",
      styles: { fontSize: 7.5, cellPadding: 2, halign: "left", valign: "middle" },
      headStyles: { fillColor: [r, g, b], textColor: [255, 255, 255], fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: labelW }, 1: { halign: "center" } },
      tableWidth: midW,
      margin: { left: x, right: W - x - midW },
    });
    return (doc as any).lastAutoTable.finalY;
  }

  // Row: tipo | categoria
  if (y > 160) { doc.addPage(); addHeader(); y = HDR + 12; }
  const endTipo = miniTable("Tipi di Infortunio", params.tipoRows, colL, y, 80, "rgb(200,16,46)");
  const endCat = miniTable("Incidenza per Categoria", params.catRows, colR, y, 60, "rgb(200,16,46)");
  y = Math.max(endTipo, endCat) + 10;

  // Row: evento | lato
  if (y > 200) { doc.addPage(); addHeader(); y = HDR + 12; }
  const endEvento = params.eventoRows.length > 0
    ? miniTable("Contesto Infortunio", params.eventoRows, colL, y, 70, "rgb(30,64,175)")
    : y;
  const endLato = params.latoRows.length > 0
    ? miniTable("Lato Colpito", params.latoRows, colR, y, 60, "rgb(124,58,237)")
    : y;
  y = Math.max(endEvento, endLato) + 10;

  // Row: pos | meccanismo
  if (y > 200) { doc.addPage(); addHeader(); y = HDR + 12; }
  const endPos = params.posRows.length > 0
    ? miniTable("Distribuzione Anatomica", params.posRows, colL, y, 70, "rgb(4,120,87)")
    : y;
  const endMech = params.mechRows.length > 0
    ? miniTable("Meccanismo", params.mechRows, colR, y, 60, "rgb(14,116,144)")
    : y;
  y = Math.max(endPos, endMech) + 10;

  // Burden
  if (params.burdenRows.length > 0) {
    if (y > 200) { doc.addPage(); addHeader(); y = HDR + 12; }
    y = secTitle("Burden – Giorni Persi per Tipo", y);
    autoTable(doc, {
      startY: y,
      head: [["Tipo di Infortunio", "Giorni Persi"]],
      body: params.burdenRows.map(([tipo, gg]) => [tipo, `${gg} gg`]),
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 2.5, halign: "left", valign: "middle" },
      headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: "center" } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Trend stagionale
  if (y > 210) { doc.addPage(); addHeader(); y = HDR + 12; }
  y = secTitle("Trend Stagionale", y);
  const MESI_FULL = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
  autoTable(doc, {
    startY: y,
    head: [["Mese", "Infortuni"]],
    body: params.monthCounts.map((n, i) => [MESI_FULL[i], n > 0 ? n : "—"]),
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2, halign: "left", valign: "middle" },
    columnStyles: { 1: { halign: "center" } },
    margin: { left: 14, right: 14 },
    tableWidth: 80,
  });

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
    doc.text(`Pagina ${i} di ${totalPages}`, W - 14, H - 8, { align: "right" });
    doc.text(`Generato il ${new Date().toLocaleDateString("it-IT")}`, 14, H - 8);
  }

  doc.save(`USC_Epidemiologia_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function csvDownload(rows: string[][], name: string) {
  const c = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const b = new Blob(["﻿" + c], { type: "text/csv;charset=utf-8;" });
  const u = URL.createObjectURL(b);
  const el = document.createElement("a"); el.href = u; el.download = name; el.click();
  URL.revokeObjectURL(u);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarraH({ label, value, max, color, extra }: {
  label: string; value: number; max: number; color: string; extra?: string;
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-40 truncate shrink-0" title={label}>{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-12 text-right shrink-0">{extra ?? value}</span>
    </div>
  );
}

function Sezione({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-0.5">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mb-4">{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EpidemiologiaPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [, setProgrammi] = useState<Programma[]>([]);
  const [filtroCat, setFiltroCat] = useState("Tutte");
  const [filtroAnno, setFiltroAnno] = useState("Tutti");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    loadAtleti().then(setAtleti);
    loadProgrammi().then(setProgrammi);
  }, []);

  const tuttiInf = useMemo(() => estraiTutti(atleti), [atleti]);

  const anni = useMemo(() => {
    const set = new Set<string>();
    tuttiInf.forEach(i => set.add(i.inizioRehab.slice(0, 4)));
    return ["Tutti", ...Array.from(set).sort().reverse()];
  }, [tuttiInf]);

  const infortuni = useMemo(() => tuttiInf.filter(i => {
    if (filtroCat !== "Tutte" && i.categoria !== filtroCat) return false;
    if (filtroAnno !== "Tutti" && !i.inizioRehab.startsWith(filtroAnno)) return false;
    return true;
  }), [tuttiInf, filtroCat, filtroAnno]);

  // ── KPI ────────────────────────────────────────────────────────────
  const totEpisodi = infortuni.length;
  const totGiorni = infortuni.reduce((s, i) => s + i.giorni, 0);
  const mediaGiorni = totEpisodi > 0 ? Math.round(totGiorni / totEpisodi) : 0;
  const reRate = totEpisodi > 0 ? Math.round((infortuni.filter(i => i.reInf).length / totEpisodi) * 100) : 0;

  // ── Severity ────────────────────────────────────────────────────────
  const sevCount = { Minima: 0, Lieve: 0, Moderata: 0, Grave: 0 };
  infortuni.forEach(i => sevCount[i.severita]++);

  // ── Maps ────────────────────────────────────────────────────────────
  const tipoRows    = Array.from(contaMap(infortuni.map(i => i.tipoInfortunio))).sort((a,b) => b[1]-a[1]).slice(0,10);
  const posRows     = Array.from(contaMap(infortuni.filter(i => i.posizione !== "—").map(i => i.posizione))).sort((a,b) => b[1]-a[1]).slice(0,10);
  const catRows     = Array.from(contaMap(infortuni.map(i => i.categoria))).sort((a,b) => b[1]-a[1]);
  const eventoRows  = Array.from(contaMap(infortuni.filter(i => i.evento !== "—").map(i => i.evento))).sort((a,b) => b[1]-a[1]);
  const latoRows    = Array.from(contaMap(infortuni.filter(i => i.lato !== "—").map(i => i.lato))).sort((a,b) => b[1]-a[1]);
  const mechRows    = Array.from(contaMap(infortuni.filter(i => i.meccanismo !== "—").map(i => i.meccanismo))).sort((a,b) => b[1]-a[1]).slice(0,8);

  const burdenMap = new Map<string, number>();
  infortuni.forEach(i => burdenMap.set(i.tipoInfortunio, (burdenMap.get(i.tipoInfortunio) ?? 0) + i.giorni));
  const burdenRows = Array.from(burdenMap).sort((a,b) => b[1]-a[1]).slice(0,10);

  // ── Monthly trend ────────────────────────────────────────────────────
  const monthCounts = Array(12).fill(0);
  infortuni.forEach(i => { const m = parseInt(i.inizioRehab.slice(5,7)) - 1; if (m >= 0 && m < 12) monthCounts[m]++; });
  const maxMonth = Math.max(...monthCounts, 1);

  const esportaPDF = async () => {
    setPdfLoading(true);
    try {
      await esportaPDFEpi({
        filtroCat, filtroAnno,
        totEpisodi, totGiorni, mediaGiorni, reRate,
        sevCount,
        tipoRows, posRows, catRows, eventoRows, latoRows, mechRows, burdenRows,
        monthCounts,
      });
    } finally { setPdfLoading(false); }
  };

  const esportaCSV = () => {
    const rows: string[][] = [["Atleta","Categoria","Tipo","Posizione","Lato","Evento","Meccanismo","Inizio","Fine","Giorni","Severità","Re-infortunio"]];
    infortuni.forEach(i => rows.push([i.nomeAtleta, i.categoria, i.tipoInfortunio, i.posizione, i.lato, i.evento, i.meccanismo, i.inizioRehab, i.fineRehab ?? "—", String(i.giorni), i.severita, i.reInf ? "Sì" : "No"]));
    csvDownload(rows, `USC_Epidemiologia_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const vuoto = totEpisodi === 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Epidemiologia</h1>
          <p className="text-gray-500 mt-1">Incidenza, severità e distribuzione degli infortuni</p>
        </div>
        <div className="flex gap-2">
          <button onClick={esportaPDF} disabled={vuoto || pdfLoading}
            className="flex items-center gap-1.5 border border-red-300 text-red-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-red-50 disabled:opacity-40 transition-colors">
            <FileText className="w-3.5 h-3.5" /> {pdfLoading ? "..." : "PDF"}
          </button>
          <button onClick={esportaCSV} disabled={vuoto}
            className="flex items-center gap-1.5 border border-green-300 text-green-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-green-50 disabled:opacity-40 transition-colors">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
          <option value="Tutte">Tutte le categorie</option>
          {CATEGORIE.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filtroAnno} onChange={e => setFiltroAnno(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
          {anni.map(a => <option key={a} value={a}>{a === "Tutti" ? "Tutti gli anni" : a}</option>)}
        </select>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <KPICard label="Episodi totali"      value={totEpisodi}       sub="infortuni registrati"   color="bg-[#C8102E]"  icon={Activity}   />
        <KPICard label="Giorni persi"        value={totGiorni}        sub="giorni di assenza"      color="bg-gray-800"   icon={Clock}      />
        <KPICard label="Durata media"        value={`${mediaGiorni} gg`} sub="per episodio"        color="bg-orange-500" icon={Shield}     />
        <KPICard label="Re-infortunio"       value={`${reRate}%`}    sub="stesso tipo infortunio" color="bg-blue-600"   icon={RotateCcw}  />
      </div>

      {vuoto ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nessun dato disponibile con i filtri selezionati.</p>
        </div>
      ) : (
        <>
          {/* Severità */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Distribuzione Severità</h2>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {(["Minima","Lieve","Moderata","Grave"] as const).map(s => (
                <div key={s} className="rounded-xl p-4 text-center" style={{ backgroundColor: SEV_COLOR[s] + "1A" }}>
                  <p className="text-2xl font-bold" style={{ color: SEV_COLOR[s] }}>{sevCount[s]}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: SEV_COLOR[s] }}>{s}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {s === "Minima" ? "1–3 gg" : s === "Lieve" ? "4–7 gg" : s === "Moderata" ? "8–28 gg" : "> 28 gg"}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
              {(["Minima","Lieve","Moderata","Grave"] as const).filter(s => sevCount[s] > 0).map(s => (
                <div key={s} title={`${s}: ${sevCount[s]}`}
                  style={{ width: `${(sevCount[s]/totEpisodi)*100}%`, backgroundColor: SEV_COLOR[s] }} />
              ))}
            </div>
          </div>

          {/* Grid 2 col */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

            {/* Incidenza per categoria */}
            <Sezione title="Incidenza per Categoria">
              {catRows.length === 0
                ? <p className="text-sm text-gray-400">Nessun dato</p>
                : <div className="space-y-3">{catRows.map(([cat, n]) => <BarraH key={cat} label={cat} value={n} max={catRows[0][1]} color="#C8102E" />)}</div>}
            </Sezione>

            {/* Contesto + Lato */}
            <Sezione title="Contesto Infortunio">
              {eventoRows.length === 0
                ? <p className="text-sm text-gray-400">Dati evento non disponibili</p>
                : <div className="space-y-3">{eventoRows.map(([ev, n]) => <BarraH key={ev} label={ev} value={n} max={eventoRows[0][1]} color={ev === "Partita" ? "#1E40AF" : "#C8102E"} />)}</div>}
              {latoRows.length > 0 && (
                <>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-5 mb-3">Lato Colpito</p>
                  <div className="space-y-3">{latoRows.map(([l, n]) => <BarraH key={l} label={l} value={n} max={latoRows[0][1]} color="#7C3AED" />)}</div>
                </>
              )}
            </Sezione>

            {/* Tipi infortunio */}
            <Sezione title="Tipi di Infortunio">
              {tipoRows.length === 0
                ? <p className="text-sm text-gray-400">Nessun dato</p>
                : <div className="space-y-3">{tipoRows.map(([tipo, n]) => <BarraH key={tipo} label={tipo} value={n} max={tipoRows[0][1]} color="#C8102E" />)}</div>}
            </Sezione>

            {/* Distribuzione anatomica */}
            <Sezione title="Distribuzione Anatomica" sub="Posizione disponibile solo per l'infortunio corrente di ciascun atleta">
              {posRows.length === 0
                ? <p className="text-sm text-gray-400">Nessun dato posizione disponibile</p>
                : <div className="space-y-3">{posRows.map(([pos, n]) => <BarraH key={pos} label={pos} value={n} max={posRows[0][1]} color="#047857" />)}</div>}
            </Sezione>
          </div>

          {/* Burden */}
          <Sezione title="Burden – Giorni Persi per Tipo" sub="Somma dei giorni di assenza per tipo di infortunio">
            {burdenRows.length === 0
              ? <p className="text-sm text-gray-400">Nessun dato</p>
              : <div className="space-y-3">{burdenRows.map(([tipo, gg]) => <BarraH key={tipo} label={tipo} value={gg} max={burdenRows[0][1]} color="#B45309" extra={`${gg} gg`} />)}</div>}
          </Sezione>

          {/* Meccanismo */}
          {mechRows.length > 0 && (
            <div className="mt-5">
              <Sezione title="Meccanismo di Infortunio">
                <div className="space-y-3">{mechRows.map(([m, n]) => <BarraH key={m} label={m} value={n} max={mechRows[0][1]} color="#0E7490" />)}</div>
              </Sezione>
            </div>
          )}

          {/* Trend stagionale */}
          <div className="mt-5">
            <Sezione title="Trend Stagionale" sub="Numero di infortuni per mese dell'anno">
              <div className="flex items-end gap-1 h-28">
                {monthCounts.map((n, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                    {n > 0 && <span className="text-[9px] text-gray-500 font-semibold">{n}</span>}
                    <div className="w-full rounded-t transition-all duration-500"
                      style={{ height: n > 0 ? `${Math.max((n/maxMonth)*100, 8)}%` : "4px",
                               backgroundColor: n > 0 ? "#C8102E" : "#F3F4F6" }} />
                    <span className="text-[9px] text-gray-400">{MESI[i]}</span>
                  </div>
                ))}
              </div>
            </Sezione>
          </div>
        </>
      )}
    </div>
  );
}

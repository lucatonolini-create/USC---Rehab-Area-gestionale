"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart2, Users, Activity, TrendingUp, Calendar, Download, FileText } from "lucide-react";
import { loadAtleti, loadProgrammi, nd, CATEGORIE, TIPI_INFORTUNIO, type Atleta, type Programma } from "@/lib/store";

const MESI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const MESI_LUNGHI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

const CAT_PALETTE = ["#C8102E","#1E40AF","#047857","#B45309","#7C3AED","#0E7490","#BE185D","#374151"];
const TIPO_PALETTE = ["#374151","#6B7280","#B45309","#1E40AF","#7C3AED","#0E7490","#047857","#BE185D"];
const hexToRgb = (h: string): [number, number, number] => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];

function BarraOrizzontale({ label, value, max, color = "bg-[#C8102E]", sub }: {
  label: string; value: number; max: number; color?: string; sub?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-24 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
          style={{ width: `${Math.max(pct, value > 0 ? 8 : 0)}%` }}>
          {value > 0 && <span className="text-xs text-white font-bold">{value}</span>}
        </div>
      </div>
      {sub && <span className="text-xs text-gray-400 w-16 shrink-0 text-right">{sub}</span>}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number | string; sub?: string; icon: any; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`${color} p-2.5 rounded-xl`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

type AnalisiTab = "overview" | "report";
type TipoReport = "mensile" | "trimestrale" | "semestrale" | "annuale" | "stagione";

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

// ─── Logo helpers ─────────────────────────────────────────────────────────────

async function getLogoDataUrl(): Promise<string | null> {
  try {
    const resp = await fetch("/logo.png");
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function getLogoArrayBuffer(): Promise<ArrayBuffer | null> {
  try {
    const resp = await fetch("/logo.png");
    if (!resp.ok) return null;
    return await resp.arrayBuffer();
  } catch { return null; }
}

// ─── Excel helpers ────────────────────────────────────────────────────────────

const XL_RED   = "FFC8102E";
const XL_DARK  = "FF2B2B2B";
const XL_WHITE = "FFFFFFFF";
const XL_LIGHT = "FFF5F5F5";

const xlRedFill  = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: XL_RED } };
const xlDarkFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: XL_DARK } };
const xlLightFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: XL_LIGHT } };
const xlWhiteFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: XL_WHITE } };
const xlHeaderFont = { bold: true, color: { argb: XL_WHITE }, size: 10 };
const xlThinBorder = {
  top:    { style: "thin" as const, color: { argb: "FFE0E0E0" } },
  bottom: { style: "thin" as const, color: { argb: "FFE0E0E0" } },
  left:   { style: "thin" as const, color: { argb: "FFE0E0E0" } },
  right:  { style: "thin" as const, color: { argb: "FFE0E0E0" } },
};

function xlAddSheetHeader(ws: any, wb: any, logoId: number | undefined, title: string, subtitle: string, oggi: string) {
  ws.getRow(1).height = 26;
  ws.getRow(2).height = 18;
  ws.getRow(3).height = 15;
  ws.getRow(4).height = 8;

  if (logoId !== undefined) {
    ws.addImage(logoId, { tl: { col: 0, row: 0 }, br: { col: 0.92, row: 3.8 }, editAs: "oneCell" });
  }

  const r1 = ws.getRow(1);
  r1.getCell(2).value = "U.S. CREMONESE – REHAB AREA";
  r1.getCell(2).font = { bold: true, size: 13, color: { argb: XL_RED } };

  const r2 = ws.getRow(2);
  r2.getCell(2).value = title;
  r2.getCell(2).font = { bold: true, size: 10, color: { argb: XL_RED } };

  const r3 = ws.getRow(3);
  r3.getCell(2).value = subtitle;
  r3.getCell(2).font = { size: 9, italic: true, color: { argb: "FF999999" } };

  ws.getRow(3).getCell(3).value = `Generato il ${oggi}`;
  ws.getRow(3).getCell(3).font = { size: 9, color: { argb: "FF999999" } };
  ws.getRow(3).getCell(3).alignment = { horizontal: "right" };
}

function xlAddColHeaders(ws: any, headers: string[], fill = xlRedFill) {
  const row = ws.addRow(headers);
  row.height = 22;
  row.eachCell((cell: any, col: number) => {
    cell.fill = fill;
    cell.font = xlHeaderFont;
    cell.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "center" };
    cell.border = xlThinBorder;
  });
  return row;
}

function xlAddDataRow(ws: any, data: any[], odd: boolean, redCols: number[] = []) {
  const row = ws.addRow(data);
  row.height = 18;
  row.eachCell({ includeEmpty: true }, (cell: any, col: number) => {
    cell.fill = odd ? xlLightFill : xlWhiteFill;
    cell.border = xlThinBorder;
    cell.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "center" };
    if (redCols.includes(col)) cell.font = { bold: true, color: { argb: XL_RED } };
  });
  return row;
}

async function xlSave(wb: any, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Excel panoramica ─────────────────────────────────────────────────────────
async function esportaExcelPanoramica(params: {
  atleti: Atleta[];
  programmi: Programma[];
  perCategoria: { cat: string; totale: number; attivi: number }[];
  perTipoInfortunio: { nome: string; count: number }[];
  perInfortunio: { nome: string; count: number }[];
  trendMensile: { label: string; count: number }[];
}) {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "U.S. Cremonese Rehab Area";

  const oggi = new Date().toLocaleDateString("it-IT");
  const attivi = params.atleti.filter((a) => a.stato !== "Disponibile").length;
  const guariti = params.atleti.filter((a) => a.stato === "Disponibile").length;

  const logoBuf = await getLogoArrayBuffer();
  const logoId = logoBuf ? wb.addImage({ buffer: logoBuf, extension: "png" }) : undefined;

  // ── Foglio 1: Riepilogo ────────────────────────────────────────────────────
  const ws1 = wb.addWorksheet("Riepilogo");
  ws1.columns = [{ width: 38 }, { width: 22 }, { width: 20 }];
  xlAddSheetHeader(ws1, wb, logoId, "ANALISI REHAB AREA", "Riepilogo generale", oggi);
  ws1.addRow([]);
  xlAddColHeaders(ws1, ["Indicatore", "Valore"], xlDarkFill);
  [
    ["Atleti totali in gestione", params.atleti.length],
    ["In riabilitazione", attivi],
    ["Guariti / Dimessi", guariti],
    ["Programmi riabilitativi creati", params.programmi.length],
  ].forEach((r, i) => xlAddDataRow(ws1, r, i % 2 !== 0, [2]));

  // ── Foglio 2: Per categoria ────────────────────────────────────────────────
  const ws2 = wb.addWorksheet("Per Categoria");
  ws2.columns = [{ width: 20 }, { width: 14 }, { width: 22 }, { width: 14 }];
  xlAddSheetHeader(ws2, wb, logoId, "ANALISI REHAB AREA", "Atleti per categoria", oggi);
  ws2.addRow([]);
  xlAddColHeaders(ws2, ["Categoria", "Totale", "In riabilitazione", "Guariti"]);
  params.perCategoria.forEach(({ cat, totale, attivi: a }, i) =>
    xlAddDataRow(ws2, [cat, totale, a, totale - a], i % 2 !== 0, [2, 3, 4]));

  // ── Foglio 3: Tipi infortunio ──────────────────────────────────────────────
  const ws3 = wb.addWorksheet("Tipi Infortunio");
  ws3.columns = [{ width: 30 }, { width: 14 }, { width: 18 }];
  xlAddSheetHeader(ws3, wb, logoId, "ANALISI REHAB AREA", "Categorie di infortunio", oggi);
  ws3.addRow([]);
  xlAddColHeaders(ws3, ["Tipo infortunio", "N° atleti", "% sul totale"]);
  params.perTipoInfortunio.forEach(({ nome, count }, i) => {
    const pct = params.atleti.length > 0 ? `${Math.round((count / params.atleti.length) * 100)}%` : "—";
    xlAddDataRow(ws3, [nome, count, pct], i % 2 !== 0, [2]);
  });

  // ── Foglio 4: Diagnosi specifiche ──────────────────────────────────────────
  const ws4 = wb.addWorksheet("Diagnosi");
  ws4.columns = [{ width: 40 }, { width: 14 }];
  xlAddSheetHeader(ws4, wb, logoId, "ANALISI REHAB AREA", "Diagnosi specifiche più frequenti", oggi);
  ws4.addRow([]);
  xlAddColHeaders(ws4, ["Diagnosi", "N° atleti"]);
  params.perInfortunio.forEach(({ nome, count }, i) => xlAddDataRow(ws4, [nome, count], i % 2 !== 0, [2]));

  // ── Foglio 5: Trend mensile ────────────────────────────────────────────────
  const ws5 = wb.addWorksheet("Trend Mensile");
  ws5.columns = [{ width: 22 }, { width: 16 }];
  xlAddSheetHeader(ws5, wb, logoId, "ANALISI REHAB AREA", "Trend mensile – ultimi 12 mesi", oggi);
  ws5.addRow([]);
  xlAddColHeaders(ws5, ["Mese", "Atleti attivi"]);
  params.trendMensile.forEach(({ label, count }, i) => xlAddDataRow(ws5, [label, count], i % 2 !== 0, [2]));

  // ── Foglio 6: Progressi medi ───────────────────────────────────────────────
  const ws6 = wb.addWorksheet("Progressi");
  ws6.columns = [{ width: 20 }, { width: 18 }, { width: 18 }];
  xlAddSheetHeader(ws6, wb, logoId, "ANALISI REHAB AREA", "Progresso medio di recupero per categoria", oggi);
  ws6.addRow([]);
  xlAddColHeaders(ws6, ["Categoria", "Atleti (attivi / guariti)", "Progresso medio"]);
  CATEGORIE.forEach((cat, i) => {
    const lista = params.atleti.filter((a) => a.categoria === cat);
    if (!lista.length) return;
    const nAttivi = lista.filter((a) => a.stato !== "Disponibile").length;
    const media = Math.round(lista.reduce((s, a) => s + a.progresso, 0) / lista.length);
    xlAddDataRow(ws6, [cat, `${nAttivi} attivi / ${lista.length - nAttivi} guariti`, `${media}%`], i % 2 !== 0, [3]);
  });

  await xlSave(wb, `USC_Analisi_${oggi.replace(/\//g, "-")}.xlsx`);
}

// ─── Excel report mensile ──────────────────────────────────────────────────────
async function esportaExcelReport(
  atletiMese: Atleta[],
  mese: number,
  anno: number,
  filtroCat: string,
  filtroTipoInf: string,
  mesiP?: { anno: number; mese: number }[],
  periodoLbl?: string,
) {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "U.S. Cremonese Rehab Area";

  const oggi = new Date().toLocaleDateString("it-IT");
  const nomeP = periodoLbl ?? `${MESI_LUNGHI[mese]} ${anno}`;
  const subtitle = [
    nomeP,
    filtroCat !== "Tutte" ? filtroCat : "",
    filtroTipoInf || "",
  ].filter(Boolean).join(" – ");

  const logoBuf = await getLogoArrayBuffer();
  const logoId = logoBuf ? wb.addImage({ buffer: logoBuf, extension: "png" }) : undefined;

  const ws = wb.addWorksheet("Report");
  ws.columns = [
    { width: 28 }, { width: 14 }, { width: 38 }, { width: 18 },
    { width: 12 }, { width: 12 }, { width: 10 }, { width: 16 }, { width: 10 },
  ];

  xlAddSheetHeader(ws, wb, logoId, "REPORT", subtitle, oggi);

  // Info totale
  ws.getRow(2).getCell(4).value = `Totale atleti: ${atletiMese.length}`;
  ws.getRow(2).getCell(4).font = { bold: true, size: 10, color: { argb: XL_DARK } };

  ws.addRow([]);

  // Intestazioni colonne
  xlAddColHeaders(ws, ["Nome", "Categoria", "Infortunio", "Tipo", "Inizio", "Fine", "Giorni", "Stato", "Progresso %"], xlDarkFill);

  // Righe dati — una riga per infortunio
  const fmtDA = (d: string) => new Date(d + "T12:00").toLocaleDateString("it-IT");
  const ggA = (inizio: string, fine?: string) => fine
    ? String(Math.round((new Date(fine + "T12:00").getTime() - new Date(inizio + "T12:00").getTime()) / 86400000))
    : "—";

  atletiMese.forEach((a, athleteIdx) => {
    const infortuni = infortunitNelPeriodo(a, mesiP ?? [{ anno, mese }]);
    const count = Math.max(infortuni.length, 1);
    const startRowNum = ws.rowCount + 1;

    const addRow = (values: any[]) => {
      xlAddDataRow(ws, values, athleteIdx % 2 !== 0, [9]);
    };
    if (infortuni.length === 0) {
      addRow([nd(a), a.categoria, "—", "—", "—", "—", "—", a.stato, `${a.progresso}%`]);
    } else {
      infortuni.forEach((inf) => {
        addRow([
          nd(a),
          a.categoria,
          inf.diagnosi,
          inf.tipo ?? "—",
          inf.inizio ? fmtDA(inf.inizio) : "—",
          inf.fine ? fmtDA(inf.fine) : "—",
          inf.inizio ? ggA(inf.inizio, inf.fine) : "—",
          a.stato,
          `${a.progresso}%`,
        ]);
      });
    }
    if (count > 1) {
      const endRowNum = startRowNum + count - 1;
      ws.mergeCells(startRowNum, 1, endRowNum, 1);
      ws.mergeCells(startRowNum, 2, endRowNum, 2);
      ws.getRow(startRowNum).getCell(1).alignment = { vertical: "middle", horizontal: "left" };
      ws.getRow(startRowNum).getCell(2).alignment = { vertical: "middle", horizontal: "left" };
    }
  });

  // Riepilogo per categoria
  ws.addRow([]);
  xlAddColHeaders(ws, ["Riepilogo per categoria", "", "N° atleti"]);
  CATEGORIE.forEach((cat, i) => {
    const n = atletiMese.filter((a) => a.categoria === cat).length;
    if (!n) return;
    xlAddDataRow(ws, [cat, "", n], i % 2 !== 0, [3]);
  });

  await xlSave(wb, `USC_Report_${nomeP.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`);
}

// ─── PDF panoramica ────────────────────────────────────────────────────────────
async function esportaPDFPanoramica(params: {
  atleti: Atleta[];
  programmi: Programma[];
  perCategoria: { cat: string; totale: number; attivi: number }[];
  perTipoInfortunio: { nome: string; count: number }[];
  perInfortunio: { nome: string; count: number }[];
  trendMensile: { label: string; count: number }[];
}) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  const red: [number, number, number] = [200, 16, 46];
  const dark: [number, number, number] = [43, 43, 43];
  const gray: [number, number, number] = [130, 130, 130];
  const oggi = new Date().toLocaleDateString("it-IT");
  const attivi = params.atleti.filter((a) => a.stato !== "Disponibile").length;
  const guariti = params.atleti.filter((a) => a.stato === "Disponibile").length;
  const logoDataUrl = await getLogoDataUrl();
  const M = 14; const W = 210; const H = 297; const HDR = 30;

  const addHeader = () => {
    doc.setFillColor(247, 247, 247); doc.rect(0, 0, W, HDR, "F");
    doc.setDrawColor(...red); doc.setLineWidth(0.4); doc.line(0, HDR, W, HDR);
    if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 4, 4, 22, 22);
    const tx = logoDataUrl ? 30 : M;
    doc.setTextColor(...red); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("U.S. Cremonese", tx, 15);
    doc.setFontSize(9); doc.setFont("helvetica", "bolditalic"); doc.setTextColor(...gray);
    doc.text("Analisi Rehab Area", tx, 19);
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
    doc.text(oggi, W - M, 15, { align: "right" });
  };

  const secTitle = (text: string, y: number) => {
    doc.setFillColor(245, 245, 245); doc.rect(M, y - 4, W - M * 2, 8, "F");
    doc.setFillColor(...red); doc.rect(M, y - 4, 2.5, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...dark);
    doc.text(text.toUpperCase(), M + 5, y + 0.8);
    return y + 11;
  };

  const addFooter = () => {
    const tot = doc.getNumberOfPages();
    for (let i = 1; i <= tot; i++) {
      doc.setPage(i);
      doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.3); doc.line(M, H - 12, W - M, H - 12);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text("U.S. Cremonese · Rehab Area – Documento riservato", M, H - 7);
      doc.text(`Pagina ${i} di ${tot}`, W - M, H - 7, { align: "right" });
    }
  };

  addHeader();

  doc.setTextColor(...dark); doc.setFontSize(15); doc.setFont("helvetica", "bold");
  doc.text("Panoramica generale", M, HDR + 12);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
  doc.text(`${params.atleti.length} atleti in gestione`, M, HDR + 20);
  doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.3); doc.line(M, HDR + 26, W - M, HDR + 26);

  let y = HDR + 33;

  y = secTitle("Riepilogo generale", y);
  autoTable(doc, {
    startY: y,
    body: [
      ["Atleti totali in gestione", String(params.atleti.length)],
      ["In riabilitazione", String(attivi)],
      ["Guariti / Dimessi", String(guariti)],
      ["Programmi riabilitativi creati", String(params.programmi.length)],
    ],
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 3, overflow: "ellipsize", halign: "left", valign: "middle" },
    columnStyles: { 0: { cellWidth: 80, fontStyle: "bold", textColor: dark }, 1: { cellWidth: 30, textColor: dark } },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: M, right: W / 2 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  y = secTitle("Atleti per categoria", y);
  autoTable(doc, {
    startY: y,
    head: [["Categoria", "Totale", "In riabilitazione", "Guariti"]],
    body: params.perCategoria.map(({ cat, totale, attivi: a }) => [cat, totale, a, totale - a]),
    headStyles: { fillColor: red, textColor: 255, fontSize: 7.5 },
    bodyStyles: { fontSize: 8.5, cellPadding: 2.5, overflow: "ellipsize" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: M, right: M },
    columnStyles: { 0: { fontStyle: "bold", textColor: dark }, 1: {}, 2: {}, 3: {} },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  if (y > 230) { doc.addPage(); addHeader(); y = HDR + 12; }
  y = secTitle("Categorie di infortunio", y);
  if (params.perTipoInfortunio.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Tipo infortunio", "N° atleti", "% sul totale"]],
      body: params.perTipoInfortunio.map(({ nome, count }) => [
        nome, count, params.atleti.length > 0 ? `${Math.round((count / params.atleti.length) * 100)}%` : "—",
      ]),
      headStyles: { fillColor: [160, 160, 160], textColor: 255, fontSize: 7.5 },
      bodyStyles: { fontSize: 8.5, cellPadding: 2.5, overflow: "ellipsize", halign: "left", valign: "middle" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: M, right: M },
      columnStyles: { 0: { fontStyle: "bold", textColor: dark }, 1: {}, 2: {} },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(8.5); doc.setFont("helvetica", "italic"); doc.setTextColor(...gray);
    doc.text("Nessun dato – compilare il campo Tipo infortunio nelle schede atleta", M, y + 3);
    y += 14;
  }

  if (params.perInfortunio.length > 0) {
    if (y > 220) { doc.addPage(); addHeader(); y = HDR + 12; }
    y = secTitle("Diagnosi specifiche più frequenti", y);
    autoTable(doc, {
      startY: y,
      head: [["Diagnosi", "N° atleti"]],
      body: params.perInfortunio.map(({ nome, count }) => [nome, count]),
      headStyles: { fillColor: dark, textColor: 255, fontSize: 7.5 },
      bodyStyles: { fontSize: 8.5, cellPadding: 2.5, overflow: "ellipsize", halign: "left", valign: "middle" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: M, right: M },
      columnStyles: { 0: { fontStyle: "bold", textColor: dark }, 1: {} },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Ensure enough vertical space so the trend table never splits across pages
  const trendRows = params.trendMensile;
  const estTrendH = (trendRows.length + 1) * 7 + 15; // rows × row-height + secTitle
  if (y + estTrendH > H - 18) { doc.addPage(); addHeader(); y = HDR + 12; }
  y = secTitle("Trend mensile – ultimi 12 mesi", y);
  const trendStartY = y;

  // Table – left half
  autoTable(doc, {
    startY: trendStartY,
    head: [["Mese", "Atleti attivi"]],
    body: trendRows.map(({ label, count }) => [label, count]),
    headStyles: { fillColor: red, textColor: 255, fontSize: 7.5 },
    bodyStyles: { fontSize: 8, cellPadding: 2, overflow: "ellipsize" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: M, right: W / 2 },
    columnStyles: { 0: { fontStyle: "bold", textColor: dark }, 1: {} },
  });
  const trendEndY = (doc as any).lastAutoTable.finalY;

  // Bar chart – right half
  const cX = W / 2 + 8; const cW = W - M - cX;
  const cH = Math.max(trendEndY - trendStartY, 60);
  const cY = trendStartY;
  const maxVal = Math.max(...trendRows.map(t => t.count), 1);
  const barSlot = cW / Math.max(trendRows.length, 1);

  doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...dark);
  doc.text("Andamento mensile atleti attivi", cX + cW / 2, cY - 2, { align: "center" });
  doc.setFillColor(248, 248, 248); doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3);
  doc.rect(cX, cY, cW, cH, "FD");

  ([0.25, 0.5, 0.75, 1] as number[]).forEach(pct => {
    const ly = cY + cH - pct * cH;
    doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.2); doc.line(cX, ly, cX + cW, ly);
    doc.setFontSize(5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
    doc.text(`${Math.round(maxVal * pct)}`, cX - 1, ly + 1.5, { align: "right" });
  });

  trendRows.forEach((t, i) => {
    const barH = t.count > 0 ? (t.count / maxVal) * (cH - 2) : 0;
    const bx = cX + i * barSlot + 1; const bw = barSlot - 2;
    if (barH > 0) {
      doc.setFillColor(...red); doc.rect(bx, cY + cH - barH, bw, barH, "F");
      doc.setFontSize(5); doc.setFont("helvetica", "bold"); doc.setTextColor(...dark);
      doc.text(`${t.count}`, bx + bw / 2, cY + cH - barH - 1, { align: "center" });
    }
    doc.setFontSize(4.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
    doc.text(t.label.split(" ")[0], bx + bw / 2, cY + cH + 4, { align: "center" });
  });

  y = Math.max(trendEndY, cY + cH) + 12;

  // ── Grafici impilati mensili (panoramica PDF) ─────────────────────────────
  const oggi_d = new Date();
  const trendStacked = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(oggi_d.getFullYear(), oggi_d.getMonth() - 11 + i, 1);
    const a2 = d.getFullYear(); const m2 = d.getMonth();
    const attv = params.atleti.filter((a) => atletaAttivoInMese(a, a2, m2));
    const perCat: Record<string, number> = {};
    const perTipo: Record<string, number> = {};
    attv.forEach((a) => {
      if (a.categoria) perCat[a.categoria] = (perCat[a.categoria] ?? 0) + 1;
      const tipo = a.tipoInfortunio ?? "Non specificato";
      perTipo[tipo] = (perTipo[tipo] ?? 0) + 1;
    });
    return { label: MESI[m2], total: attv.length, perCat, perTipo };
  });
  const maxStackVal = Math.max(...trendStacked.map((t) => t.total), 1);
  const catStacked = CATEGORIE.filter((cat) => trendStacked.some((t) => (t.perCat[cat] ?? 0) > 0));
  const tipiStacked = Array.from(new Set(trendStacked.flatMap((t) => Object.keys(t.perTipo)))).sort();
  const catColPdf: Record<string, [number,number,number]> = {};
  catStacked.forEach((cat, i) => { catColPdf[cat] = hexToRgb(CAT_PALETTE[i % CAT_PALETTE.length]); });
  const tipoColPdf: Record<string, [number,number,number]> = {};
  tipiStacked.forEach((tipo, i) => { tipoColPdf[tipo] = hexToRgb(TIPO_PALETTE[i % TIPO_PALETTE.length]); });

  const drawStackedBar = (
    title: string, sy: number,
    keys: string[], getC: (t: typeof trendStacked[0], k: string) => number,
    colorMap: Record<string, [number,number,number]>
  ): number => {
    const cHh = 38; const cWw = W - M * 2; const slot = cWw / 12;
    doc.setFontSize(6); doc.setFont("helvetica", "bold"); doc.setTextColor(...dark);
    doc.text(title, M + cWw / 2, sy, { align: "center" }); sy += 2;
    doc.setFillColor(248,248,248); doc.setDrawColor(220,220,220); doc.setLineWidth(0.3);
    doc.rect(M, sy, cWw, cHh, "FD");
    [0.5, 1].forEach((pct) => {
      const ly = sy + cHh - pct * cHh;
      doc.setDrawColor(220,220,220); doc.setLineWidth(0.2); doc.line(M, ly, M + cWw, ly);
      doc.setFontSize(4); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
      doc.text(`${Math.round(maxStackVal * pct)}`, M - 1, ly + 1, { align: "right" });
    });
    trendStacked.forEach((t, i) => {
      const bx = M + i * slot + 0.5; const bw = slot - 1;
      let bot = sy + cHh;
      keys.forEach((k) => {
        const cnt = getC(t, k);
        if (!cnt) return;
        const segH = (cnt / maxStackVal) * cHh;
        bot -= segH;
        doc.setFillColor(...(colorMap[k] ?? [180,180,180] as [number,number,number]));
        doc.rect(bx, bot, bw, segH, "F");
      });
      doc.setFontSize(4); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
      doc.text(t.label, bx + bw / 2, sy + cHh + 3, { align: "center" });
    });
    return sy + cHh + 5;
  };

  const drawLegend = (items: string[], colorMap: Record<string, [number,number,number]>, sy: number): number => {
    let lx = M; let ly = sy;
    items.forEach((k) => {
      if (lx + 36 > W - M) { lx = M; ly += 5; }
      doc.setFillColor(...(colorMap[k] ?? [180,180,180] as [number,number,number]));
      doc.rect(lx, ly - 2.5, 3, 3, "F");
      doc.setFontSize(5); doc.setFont("helvetica", "normal"); doc.setTextColor(...dark);
      const lbl = k.length > 20 ? k.slice(0, 19) + "…" : k;
      doc.text(lbl, lx + 4.5, ly + 0.3);
      lx += Math.min(lbl.length * 1.7 + 9, 44);
    });
    return ly + 7;
  };

  if (catStacked.length > 0 || tipiStacked.length > 0) {
    const needH2 = 120;
    if (y + needH2 > H - 18) { doc.addPage(); addHeader(); y = HDR + 12; }
    y = secTitle("Distribuzione mensile per categoria e tipologia", y);
    y = drawStackedBar("Per categoria squadra", y, catStacked, (t, k) => t.perCat[k] ?? 0, catColPdf);
    y = drawLegend(catStacked, catColPdf, y);
    if (y + 60 > H - 18) { doc.addPage(); addHeader(); y = HDR + 12; }
    y = drawStackedBar("Per tipo di infortunio", y, tipiStacked, (t, k) => t.perTipo[k] ?? 0, tipoColPdf);
    y = drawLegend(tipiStacked, tipoColPdf, y);
  }

  // ── Infortuni per squadra e tipo (panoramica) ─────────────────────────────
  const attiviPan = params.atleti.filter((a) => a.stato !== "Disponibile");
  const tipiPan = Array.from(new Set(attiviPan.map((a) => a.tipoInfortunio ?? "Non specificato"))).sort();
  if (tipiPan.length > 0) {
    const catPanList = CATEGORIE.filter((cat) => attiviPan.some((a) => a.categoria === cat));
    const crossPan: any[][] = catPanList.map((cat) => {
      const ca = attiviPan.filter((a) => a.categoria === cat);
      const tm: Record<string, number> = {};
      ca.forEach((a) => { const t = a.tipoInfortunio ?? "Non specificato"; tm[t] = (tm[t] ?? 0) + 1; });
      return [cat, ca.length, ...tipiPan.map((t) => tm[t] ?? 0)];
    });
    const gtPan = crossPan.reduce((s, r) => s + (r[1] as number), 0);
    const ttPan = tipiPan.map((_, ti) => crossPan.reduce((s, r) => s + (r[ti + 2] as number), 0));
    const totRowPan: any[] = [{ content: "TOTALE", styles: { fontStyle: "bold" } }, gtPan, ...ttPan];
    const needHPan = (crossPan.length + 2) * 8 + 20;
    if (y + needHPan > H - 18) { doc.addPage(); addHeader(); y = HDR + 12; }
    y = secTitle("Infortuni per squadra e tipo", y);
    autoTable(doc, {
      startY: y,
      head: [["Squadra", "Totale", ...tipiPan]],
      body: [...crossPan, totRowPan],
      headStyles: { fillColor: dark, textColor: 255, fontSize: 7.5, halign: "center" },
      bodyStyles: { fontSize: 8, cellPadding: 2.5, halign: "center", valign: "middle" },
      columnStyles: { 0: { halign: "left", cellWidth: 35 }, 1: { cellWidth: 18, fontStyle: "bold" } },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.row.index === crossPan.length) {
          data.cell.styles.fillColor = dark; data.cell.styles.textColor = [255, 255, 255];
        } else if (data.section === "body" && data.row.index % 2 === 1) {
          data.cell.styles.fillColor = [248, 248, 248];
        }
      },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  const progressiRows = CATEGORIE.map((cat) => {
    const lista = params.atleti.filter((a) => a.categoria === cat);
    if (!lista.length) return null;
    const media = Math.round(lista.reduce((s, a) => s + a.progresso, 0) / lista.length);
    const nAttivi = lista.filter((a) => a.stato !== "Disponibile").length;
    return [cat, `${nAttivi} attivi / ${lista.length - nAttivi} guariti`, `${media}%`];
  }).filter(Boolean) as any[][];

  if (progressiRows.length > 0) {
    if (y > 220) { doc.addPage(); addHeader(); y = HDR + 12; }
    y = secTitle("Progresso medio di recupero per categoria", y);
    autoTable(doc, {
      startY: y,
      head: [["Categoria", "Atleti (attivi / guariti)", "Progresso medio"]],
      body: progressiRows,
      headStyles: { fillColor: dark, textColor: 255, fontSize: 7.5 },
      bodyStyles: { fontSize: 8.5, cellPadding: 2.5, overflow: "ellipsize", halign: "left", valign: "middle" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: M, right: M },
      columnStyles: { 0: { fontStyle: "bold", textColor: dark }, 1: {}, 2: {} },
    });
  }

  // Lista completa atleti (tutti, inclusi guariti) – una riga per infortunio
  const fmtD = (d?: string) => d ? new Date(d + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

  const atletiOrdinati = [...params.atleti].sort(
    (a, b) => a.stato === b.stato ? nd(a).localeCompare(nd(b)) : a.stato === "Infortunato" ? -1 : 1
  );

  const tuttiRows: any[] = [];
  const athleteForRowT: number[] = [];

  atletiOrdinati.forEach((a, athleteIdx) => {
    const infortuni: Array<{ diagnosi: string; inizio?: string; fine?: string }> = [];
    if (a.infortunio || a.inizioRehab)
      infortuni.push({ diagnosi: a.infortunio || "—", inizio: a.inizioRehab, fine: a.fineRehab });
    (a.storicoInfortuni ?? []).forEach((s) =>
      infortuni.push({ diagnosi: s.diagnosi, inizio: s.inizioRehab, fine: s.fineRehab })
    );

    const n = infortuni.length;
    const nomeDataStyle = { fontStyle: "bold" as const };
    if (n === 0) {
      tuttiRows.push([{ content: nd(a), styles: nomeDataStyle }, a.categoria, "—", a.stato, "—", "—", `${a.progresso}%`]);
      athleteForRowT.push(athleteIdx);
    } else {
      infortuni.forEach((inf, infIdx) => {
        if (infIdx === 0) {
          tuttiRows.push([
            { content: nd(a), rowSpan: n, styles: { ...nomeDataStyle, valign: "middle" as const } },
            { content: a.categoria, rowSpan: n, styles: { valign: "middle" } },
            inf.diagnosi,
            { content: a.stato, rowSpan: n, styles: { valign: "middle" } },
            fmtD(inf.inizio), fmtD(inf.fine),
            { content: `${a.progresso}%`, rowSpan: n, styles: { valign: "middle" } },
          ]);
        } else {
          tuttiRows.push([inf.diagnosi, fmtD(inf.inizio), fmtD(inf.fine)]);
        }
        athleteForRowT.push(athleteIdx);
      });
    }
  });

  if (tuttiRows.length > 0) {
    doc.addPage(); addHeader(); y = HDR + 12;
    y = secTitle("Lista completa atleti", y);
    autoTable(doc, {
      startY: y,
      head: [["Atleta", "Categoria", "Diagnosi", "Stato", "Inizio", "Fine", "%"]],
      body: tuttiRows,
      headStyles: { fillColor: dark, textColor: 255, fontSize: 7.5 },
      bodyStyles: { fontSize: 8, cellPadding: 2.5, overflow: "ellipsize", halign: "left", valign: "middle" },
      margin: { left: M, right: M },
      columnStyles: {
        0: { cellWidth: 36 },
        1: { cellWidth: 22 },
        2: { cellWidth: 52 },
        3: { cellWidth: 24 },
        4: { cellWidth: 16 },
        5: { cellWidth: 16 },
        6: { cellWidth: 16 },
      },
      didParseCell: (data: any) => {
        if (data.section === "body") {
          const ai = athleteForRowT[data.row.index];
          data.cell.styles.fillColor = ai % 2 !== 0 ? [248, 248, 248] : [255, 255, 255];
          if (data.column.index === 3) {
            const content = typeof data.cell.raw === "object" ? (data.cell.raw as any)?.content : data.cell.raw;
            data.cell.styles.textColor = content === "Disponibile" ? [34, 139, 34] : red;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
  }

  addFooter();
  doc.save(`USC_Analisi_${oggi.replace(/\//g, "-")}.pdf`);
}

// ─── PDF report mensile ────────────────────────────────────────────────────────
async function esportaPDFReport(
  atletiMese: Atleta[],
  mese: number,
  anno: number,
  filtroCat: string,
  filtroTipoInf?: string,
  atleti?: Atleta[],
  mesiP?: { anno: number; mese: number }[],
  periodoLbl?: string,
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape" });
  const red: [number, number, number] = [200, 16, 46];
  const dark: [number, number, number] = [43, 43, 43];
  const gray: [number, number, number] = [130, 130, 130];
  const oggi = new Date().toLocaleDateString("it-IT");
  const logoDataUrl = await getLogoDataUrl();
  const M = 14; const W = 297; const H = 210; const HDR = 30;

  const addHeader = () => {
    doc.setFillColor(247, 247, 247); doc.rect(0, 0, W, HDR, "F");
    doc.setDrawColor(...red); doc.setLineWidth(0.4); doc.line(0, HDR, W, HDR);
    if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 4, 4, 22, 22);
    const tx = logoDataUrl ? 30 : M;
    doc.setTextColor(...red); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("U.S. Cremonese", tx, 15);
    doc.setFontSize(9); doc.setFont("helvetica", "bolditalic"); doc.setTextColor(...gray);
    doc.text("Report", tx, 19);
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
    doc.text(oggi, W - M, 15, { align: "right" });
  };

  const secTitle = (text: string, y: number) => {
    doc.setFillColor(245, 245, 245); doc.rect(M, y - 4, W - M * 2, 8, "F");
    doc.setFillColor(...red); doc.rect(M, y - 4, 2.5, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...dark);
    doc.text(text.toUpperCase(), M + 5, y + 0.8);
    return y + 11;
  };

  const addFooter = () => {
    const tot = doc.getNumberOfPages();
    for (let i = 1; i <= tot; i++) {
      doc.setPage(i);
      doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.3); doc.line(M, H - 12, W - M, H - 12);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text("U.S. Cremonese · Rehab Area – Documento riservato", M, H - 7);
      doc.text(`Pagina ${i} di ${tot}`, W - M, H - 7, { align: "right" });
    }
  };

  addHeader();

  const nomeP = periodoLbl ?? `${MESI_LUNGHI[mese]} ${anno}`;
  const filtri = [filtroCat !== "Tutte" ? filtroCat : "", filtroTipoInf || ""].filter(Boolean).join("  ·  ");
  doc.setTextColor(...dark); doc.setFontSize(17); doc.setFont("helvetica", "bold");
  doc.text(nomeP, M, HDR + 13);
  if (filtri) {
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
    doc.text(filtri, M, HDR + 21);
  }
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
  doc.text(`${atletiMese.length} atleti nel periodo`, W - M, HDR + 13, { align: "right" });
  doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.3); doc.line(M, HDR + 26, W - M, HDR + 26);

  let y = HDR + 33;

  const catRows = CATEGORIE.map((cat) => {
    const n = atletiMese.filter((a) => a.categoria === cat).length;
    return n ? [cat, `${n} atleti`] : null;
  }).filter(Boolean) as any[][];

  if (catRows.length > 0) {
    y = secTitle("Riepilogo per categoria", y);
    autoTable(doc, {
      startY: y, body: catRows, theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 2.5, overflow: "ellipsize", halign: "left", valign: "middle" },
      columnStyles: { 0: { cellWidth: 45, fontStyle: "bold", textColor: dark }, 1: { cellWidth: 25, textColor: dark } },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: M, right: W / 2 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Grafici distribuzione ──────────────────────────────────────────────────
  const totMese = atletiMese.length;
  const catChart = CATEGORIE.map((cat) => {
    const n = atletiMese.filter((a) => a.categoria === cat).length;
    return { label: cat, count: n, pct: totMese > 0 ? Math.round((n / totMese) * 100) : 0 };
  }).filter((x) => x.count > 0);

  // Per-category injury type breakdown: % relative to each category's own total
  const catTipoCharts: { cat: string; items: { label: string; count: number; pct: number }[] }[] = [];
  CATEGORIE.forEach((cat) => {
    const catAtleti = atletiMese.filter((a) => a.categoria === cat);
    if (catAtleti.length === 0) return;
    const tipoMap: Record<string, number> = {};
    catAtleti.forEach((a) => {
      const infMese = infortunitNelPeriodo(a, mesiP ?? [{ anno, mese }]);
      if (infMese.length === 0) return;
      Array.from(new Set(infMese.map((i) => i.tipo ?? "Non specificato"))).forEach((t) => {
        tipoMap[t] = (tipoMap[t] ?? 0) + 1;
      });
    });
    const totalCat = Object.values(tipoMap).reduce((s, v) => s + v, 0);
    if (totalCat === 0) return;
    catTipoCharts.push({
      cat,
      items: Object.entries(tipoMap)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count, pct: Math.round((count / totalCat) * 100) })),
    });
  });

  const rightRows = catTipoCharts.reduce((s, c) => s + c.items.length + 1, 0);

  if (catChart.length > 0 || catTipoCharts.length > 0) {
    const rowH = 9;
    const needH = Math.max(catChart.length, rightRows) * rowH + 26;
    if (y + needH > H - 18) { doc.addPage(); addHeader(); y = HDR + 12; }
    y = secTitle("Distribuzione infortuni nel periodo", y);

    const halfW = (W - M * 2 - 10) / 2;
    const labelW = 32;
    const pctW = 20;
    const barMaxW = halfW - labelW - pctW - 4;

    const drawHorizChart = (data: { label: string; count: number; pct: number }[], startX: number, title: string) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...dark);
      doc.text(title, startX, y - 2);
      data.forEach((item, i) => {
        const rowY = y + 2 + i * rowH;
        const barLen = item.pct > 0 ? (item.pct / 100) * barMaxW : 0;
        doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...gray);
        const lbl = item.label.length > 16 ? item.label.slice(0, 15) + "…" : item.label;
        doc.text(lbl, startX, rowY + 5.5);
        doc.setFillColor(235, 235, 235);
        doc.roundedRect(startX + labelW, rowY + 1, barMaxW, rowH - 3, 1, 1, "F");
        if (barLen > 0) {
          doc.setFillColor(...red);
          doc.roundedRect(startX + labelW, rowY + 1, barLen, rowH - 3, 1, 1, "F");
        }
        doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...dark);
        doc.text(`${item.count}  ${item.pct}%`, startX + labelW + barMaxW + 3, rowY + 5.5);
      });
    };

    drawHorizChart(catChart, M, "Atleti per categoria squadra");

    if (catTipoCharts.length > 0) {
      const rx = M + halfW + 10;
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...dark);
      doc.text("Per tipo di infortunio", rx, y - 2);
      let rightY = y + 2;
      catTipoCharts.forEach(({ cat, items }) => {
        doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(...gray);
        doc.text(cat, rx, rightY + 4.5);
        rightY += rowH;
        items.forEach((item) => {
          const barLen = item.pct > 0 ? (item.pct / 100) * barMaxW : 0;
          doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...gray);
          const lbl = item.label.length > 16 ? item.label.slice(0, 15) + "…" : item.label;
          doc.text(lbl, rx, rightY + 5.5);
          doc.setFillColor(235, 235, 235);
          doc.roundedRect(rx + labelW, rightY + 1, barMaxW, rowH - 3, 1, 1, "F");
          if (barLen > 0) {
            doc.setFillColor(...red);
            doc.roundedRect(rx + labelW, rightY + 1, barLen, rowH - 3, 1, 1, "F");
          }
          doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...dark);
          doc.text(`${item.count}  ${item.pct}%`, rx + labelW + barMaxW + 3, rightY + 5.5);
          rightY += rowH;
        });
        rightY += 3;
      });
    }

    y += 4 + Math.max(catChart.length, rightRows) * rowH + 10;
  }

  // ── Tabella incrociata squadra × tipo infortunio ───────────────────────────
  const tipiPresenti = Array.from(
    new Set(atletiMese.flatMap((a) => infortunitNelPeriodo(a, mesiP ?? [{ anno, mese }]).map((i) => i.tipo ?? "Non specificato")))
  ).sort();

  if (tipiPresenti.length > 0) {
    const catPresenti = CATEGORIE.filter((cat) => atletiMese.some((a) => a.categoria === cat));
    const crossBody: any[][] = catPresenti.map((cat) => {
      const catAtleti = atletiMese.filter((a) => a.categoria === cat);
      const tipoMap: Record<string, number> = {};
      catAtleti.forEach((a) => {
        infortunitNelPeriodo(a, mesiP ?? [{ anno, mese }]).forEach((inf) => {
          const t = inf.tipo ?? "Non specificato";
          tipoMap[t] = (tipoMap[t] ?? 0) + 1;
        });
      });
      const tot = Object.values(tipoMap).reduce((s, v) => s + v, 0);
      return [cat, tot, ...tipiPresenti.map((t) => tipoMap[t] ?? 0)];
    });
    const grandTotal = crossBody.reduce((s, r) => s + (r[1] as number), 0);
    const tipeTotals = tipiPresenti.map((_, ti) => crossBody.reduce((s, r) => s + (r[ti + 2] as number), 0));
    const totRow: any[] = [{ content: "TOTALE", styles: { fontStyle: "bold" } }, grandTotal, ...tipeTotals];

    const needHCross = (crossBody.length + 2) * 8 + 20;
    if (y + needHCross > H - 18) { doc.addPage(); addHeader(); y = HDR + 12; }
    y = secTitle("Infortuni per squadra e tipo", y);
    autoTable(doc, {
      startY: y,
      head: [["Squadra", "Totale", ...tipiPresenti]],
      body: [...crossBody, totRow],
      headStyles: { fillColor: dark, textColor: 255, fontSize: 7.5, halign: "center" },
      bodyStyles: { fontSize: 8, cellPadding: 2.5, halign: "center", valign: "middle" },
      columnStyles: { 0: { halign: "left", cellWidth: 35 }, 1: { cellWidth: 18, fontStyle: "bold" } },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.row.index === crossBody.length) {
          data.cell.styles.fillColor = dark;
          data.cell.styles.textColor = [255, 255, 255];
        } else if (data.section === "body" && data.row.index % 2 === 1) {
          data.cell.styles.fillColor = [248, 248, 248];
        }
      },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Trend mensile 12 mesi impilato ────────────────────────────────────────
  if (atleti && atleti.length > 0) {
    const trendR = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(anno, mese - 11 + i, 1);
      const a2 = d.getFullYear(); const m2 = d.getMonth();
      const attv = atleti.filter((a) => atletaAttivoInMese(a, a2, m2));
      const perCat: Record<string, number> = {};
      const perTipo: Record<string, number> = {};
      attv.forEach((a) => {
        if (a.categoria) perCat[a.categoria] = (perCat[a.categoria] ?? 0) + 1;
        const tipo = a.tipoInfortunio ?? "Non specificato";
        perTipo[tipo] = (perTipo[tipo] ?? 0) + 1;
      });
      return { label: MESI[m2], total: attv.length, perCat, perTipo };
    });
    const maxRVal = Math.max(...trendR.map((t) => t.total), 1);
    const catR = CATEGORIE.filter((cat) => trendR.some((t) => (t.perCat[cat] ?? 0) > 0));
    const tipiR = Array.from(new Set(trendR.flatMap((t) => Object.keys(t.perTipo)))).sort();
    const catColR: Record<string, [number, number, number]> = {};
    catR.forEach((cat, i) => { catColR[cat] = hexToRgb(CAT_PALETTE[i % CAT_PALETTE.length]); });
    const tipoColR: Record<string, [number, number, number]> = {};
    tipiR.forEach((tipo, i) => { tipoColR[tipo] = hexToRgb(TIPO_PALETTE[i % TIPO_PALETTE.length]); });

    const drawBarR = (
      title: string, sy: number,
      keys: string[], getC: (t: typeof trendR[0], k: string) => number,
      colorMap: Record<string, [number, number, number]>
    ): number => {
      const cHr = 38; const cWr = W - M * 2; const slot = cWr / 12;
      doc.setFontSize(6); doc.setFont("helvetica", "bold"); doc.setTextColor(...dark);
      doc.text(title, M + cWr / 2, sy, { align: "center" }); sy += 2;
      doc.setFillColor(248, 248, 248); doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3);
      doc.rect(M, sy, cWr, cHr, "FD");
      [0.5, 1].forEach((pct) => {
        const ly = sy + cHr - pct * cHr;
        doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2); doc.line(M, ly, M + cWr, ly);
        doc.setFontSize(4); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
        doc.text(`${Math.round(maxRVal * pct)}`, M - 1, ly + 1, { align: "right" });
      });
      trendR.forEach((t, i) => {
        const bx = M + i * slot + 0.5; const bw = slot - 1;
        let bot = sy + cHr;
        keys.forEach((k) => {
          const cnt = getC(t, k);
          if (!cnt) return;
          const segH = (cnt / maxRVal) * cHr;
          bot -= segH;
          doc.setFillColor(...(colorMap[k] ?? [180, 180, 180] as [number, number, number]));
          doc.rect(bx, bot, bw, segH, "F");
        });
        doc.setFontSize(4); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
        doc.text(t.label, bx + bw / 2, sy + cHr + 3, { align: "center" });
      });
      return sy + cHr + 5;
    };

    const drawLegR = (items: string[], colorMap: Record<string, [number, number, number]>, sy: number): number => {
      let lx = M; let ly = sy;
      items.forEach((k) => {
        if (lx + 36 > W - M) { lx = M; ly += 5; }
        doc.setFillColor(...(colorMap[k] ?? [180, 180, 180] as [number, number, number]));
        doc.rect(lx, ly - 2.5, 3, 3, "F");
        doc.setFontSize(5); doc.setFont("helvetica", "normal"); doc.setTextColor(...dark);
        const lbl = k.length > 20 ? k.slice(0, 19) + "…" : k;
        doc.text(lbl, lx + 4.5, ly + 0.3);
        lx += Math.min(lbl.length * 1.7 + 9, 44);
      });
      return ly + 7;
    };

    if (catR.length > 0 || tipiR.length > 0) {
      const needHR = 120;
      if (y + needHR > H - 18) { doc.addPage(); addHeader(); y = HDR + 12; }
      y = secTitle("Trend mensile – ultimi 12 mesi", y);
      y = drawBarR("Per categoria squadra", y, catR, (t, k) => t.perCat[k] ?? 0, catColR);
      y = drawLegR(catR, catColR, y);
      if (y + 60 > H - 18) { doc.addPage(); addHeader(); y = HDR + 12; }
      y = drawBarR("Per tipo di infortunio", y, tipiR, (t, k) => t.perTipo[k] ?? 0, tipoColR);
      y = drawLegR(tipiR, tipoColR, y);
    }
  }

  y = secTitle("Dettaglio atleti", y);

  const fmtDPdf = (d: string) => new Date(d + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const ggPdf = (inizio: string, fine?: string) => fine
    ? `${Math.round((new Date(fine + "T12:00").getTime() - new Date(inizio + "T12:00").getTime()) / 86400000)}gg`
    : "—";

  const analisiRows: any[][] = [];
  const athleteForRowA: number[] = [];
  atletiMese.forEach((a, athleteIdx) => {
    const tuttiInf = infortunitNelPeriodo(a, mesiP ?? [{ anno, mese }]);
    const infortuni = filtroTipoInf
      ? tuttiInf.filter((inf) => (inf.tipo ?? "") === filtroTipoInf)
      : tuttiInf;
    const count = Math.max(infortuni.length, 1);
    if (infortuni.length === 0) {
      analisiRows.push([{ content: nd(a), styles: { fontStyle: "bold" } }, a.categoria, "—", "—", "—", "—", "—", a.stato, `${a.progresso}%`]);
      athleteForRowA.push(athleteIdx);
    } else {
      infortuni.forEach((inf, i) => {
        const row: any[] = [];
        if (i === 0) {
          row.push(
            { content: nd(a), rowSpan: count, styles: { valign: "middle", fontStyle: "bold" } },
            { content: a.categoria, rowSpan: count, styles: { valign: "middle" } },
          );
        }
        row.push(
          inf.diagnosi,
          inf.tipo ?? "—",
          inf.inizio ? fmtDPdf(inf.inizio) : "—",
          inf.fine ? fmtDPdf(inf.fine) : "—",
          inf.inizio ? ggPdf(inf.inizio, inf.fine) : "—",
          a.stato,
          `${a.progresso}%`,
        );
        analisiRows.push(row);
        athleteForRowA.push(athleteIdx);
      });
    }
  });

  autoTable(doc, {
    startY: y,
    head: [["Atleta", "Categoria", "Infortunio", "Tipo", "Inizio", "Fine", "Giorni", "Stato", "%"]],
    body: analisiRows,
    headStyles: { fillColor: dark, textColor: 255, fontSize: 7.5 },
    bodyStyles: { fontSize: 8, cellPadding: 2.5, halign: "left", valign: "middle" },
    margin: { left: M, right: M },
    columnStyles: {
      0: { cellWidth: 38 }, 1: { cellWidth: 24 }, 2: { cellWidth: 74 },
      3: { cellWidth: 26 }, 4: { cellWidth: 22 }, 5: { cellWidth: 22 },
      6: { cellWidth: 15 }, 7: { cellWidth: 28 }, 8: { cellWidth: 15 },
    },
    didParseCell: (data: any) => {
      if (data.section === "body") {
        const ai = athleteForRowA[data.row.index];
        data.cell.styles.fillColor = ai % 2 !== 0 ? [248, 248, 248] : [255, 255, 255];
      }
    },
  });

  addFooter();
  doc.save(`USC_Report_${nomeP.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

// ─── Componente principale ─────────────────────────────────────────────────────
export default function AnalisiPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [programmi, setProgrammi] = useState<Programma[]>([]);
  const [tab, setTab] = useState<AnalisiTab>("overview");
  const [esportando, setEsportando] = useState<string | null>(null);

  const oggi = new Date();
  const [reportAnno, setReportAnno] = useState(oggi.getFullYear());
  const [reportMese, setReportMese] = useState(oggi.getMonth());
  const [filtroCat, setFiltroCat] = useState("Tutte");
  const [filtroTipoInf, setFiltroTipoInf] = useState("Tutti");
  const [tipoReport, setTipoReport] = useState<TipoReport>("mensile");
  const [stagioneMeseInizio, setStagioneMeseInizio] = useState(6);
  const [stagioneMeseFine, setStagioneMeseFine] = useState(5);

  useEffect(() => {
    loadAtleti().then(setAtleti);
    loadProgrammi().then(setProgrammi);
  }, []);

  const attivi = atleti.filter((a) => a.stato !== "Disponibile");
  const guariti = atleti.filter((a) => a.stato === "Disponibile");

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
    if (tipoReport === "mensile") return `${MESI_LUNGHI[reportMese]} ${reportAnno}`;
    const first = mesiPeriodo[0];
    const last = mesiPeriodo[mesiPeriodo.length - 1];
    const annoLbl = first.anno === last.anno ? `${first.anno}` : `${first.anno}–${last.anno}`;
    const tipoLbl = tipoReport === "trimestrale" ? "Trimestre" : tipoReport === "semestrale" ? "Semestre" : tipoReport === "annuale" ? "Anno" : "Stagione";
    return `${tipoLbl} ${MESI_LUNGHI[first.mese]}–${MESI_LUNGHI[last.mese]} ${annoLbl}`;
  })();

  const perCategoria = useMemo(() => {
    return CATEGORIE.map((cat) => ({
      cat,
      totale: atleti.filter((a) => a.categoria === cat).length,
      attivi: atleti.filter((a) => a.categoria === cat && a.stato !== "Disponibile").length,
    })).filter((x) => x.totale > 0);
  }, [atleti]);

  const perTipoInfortunio = useMemo(() => {
    const map: Record<string, number> = {};
    TIPI_INFORTUNIO.forEach((t) => { map[t] = 0; });
    atleti.forEach((a) => {
      if (a.tipoInfortunio) map[a.tipoInfortunio] = (map[a.tipoInfortunio] ?? 0) + 1;
      (a.storicoInfortuni ?? []).forEach((s) => {
        if (s.tipo && s.tipo in map) map[s.tipo] = (map[s.tipo] ?? 0) + 1;
      });
    });
    return Object.entries(map).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).map(([nome, count]) => ({ nome, count }));
  }, [atleti]);

  const perInfortunio = useMemo(() => {
    const map: Record<string, number> = {};
    atleti.forEach((a) => {
      if (a.infortunio) map[a.infortunio.trim()] = (map[a.infortunio.trim()] ?? 0) + 1;
      (a.storicoInfortuni ?? []).forEach((s) => {
        if (s.diagnosi) map[s.diagnosi.trim()] = (map[s.diagnosi.trim()] ?? 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([nome, count]) => ({ nome, count }));
  }, [atleti]);

  const trendMensile = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(oggi.getFullYear(), oggi.getMonth() - 11 + i, 1);
      const anno = d.getFullYear();
      const mese = d.getMonth();
      const count = atleti.filter((a) => atletaAttivoInMese(a, anno, mese)).length;
      return { label: `${MESI[mese]} ${anno !== oggi.getFullYear() ? anno : ""}`.trim(), count };
    });
  }, [atleti]);

  const maxTrend = Math.max(...trendMensile.map((t) => t.count), 1);
  const maxCat = Math.max(...perCategoria.map((x) => x.totale), 1);
  const maxTipo = Math.max(...perTipoInfortunio.map((x) => x.count), 1);
  const maxInf = Math.max(...perInfortunio.map((x) => x.count), 1);

  const infPerSquadra = useMemo(() => {
    const totalAttivi = attivi.length;
    return CATEGORIE.map((cat) => {
      const catAttivi = attivi.filter((a) => a.categoria === cat);
      const tipoMap: Record<string, number> = {};
      catAttivi.forEach((a) => {
        const tipo = a.tipoInfortunio ?? "Non specificato";
        tipoMap[tipo] = (tipoMap[tipo] ?? 0) + 1;
      });
      const catTotal = catAttivi.length;
      return {
        cat,
        total: catTotal,
        pct: totalAttivi > 0 ? Math.round((catTotal / totalAttivi) * 100) : 0,
        tipi: Object.entries(tipoMap).sort((a, b) => b[1] - a[1]).map(([nome, count]) => ({
          nome,
          count,
          pct: catTotal > 0 ? Math.round((count / catTotal) * 100) : 0,
        })),
      };
    }).filter((x) => x.total > 0);
  }, [attivi]);

  const trendCombinato = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(oggi.getFullYear(), oggi.getMonth() - 11 + i, 1);
      const anno = d.getFullYear(); const mese = d.getMonth();
      const label = MESI[mese] + (anno !== oggi.getFullYear() ? ` ${anno}` : "");
      const attv = atleti.filter((a) => atletaAttivoInMese(a, anno, mese));
      const perCat: Record<string, number> = {};
      const perTipo: Record<string, number> = {};
      attv.forEach((a) => {
        if (a.categoria) perCat[a.categoria] = (perCat[a.categoria] ?? 0) + 1;
        const tipo = a.tipoInfortunio ?? "Non specificato";
        perTipo[tipo] = (perTipo[tipo] ?? 0) + 1;
      });
      return { label, nomeMese: MESI[mese], total: attv.length, perCat, perTipo };
    });
    const catPresenti = CATEGORIE.filter((cat) => months.some((t) => (t.perCat[cat] ?? 0) > 0));
    const tipiPresenti = Array.from(new Set(months.flatMap((t) => Object.keys(t.perTipo)))).sort();
    const catColorMap: Record<string, string> = {};
    catPresenti.forEach((cat, i) => { catColorMap[cat] = CAT_PALETTE[i % CAT_PALETTE.length]; });
    const tipoColorMap: Record<string, string> = {};
    tipiPresenti.forEach((tipo, i) => { tipoColorMap[tipo] = TIPO_PALETTE[i % TIPO_PALETTE.length]; });
    const maxVal = Math.max(...months.map((t) => t.total), 1);
    return { months, catPresenti, tipiPresenti, catColorMap, tipoColorMap, maxVal };
  }, [atleti]);

  const anni = Array.from({ length: 5 }, (_, i) => oggi.getFullYear() - 2 + i);
  const atletiMese = atleti.filter((a) => {
    if (!mesiPeriodo.some(({ anno, mese }) => atletaAttivoInMese(a, anno, mese))) return false;
    if (filtroCat !== "Tutte" && a.categoria !== filtroCat) return false;
    if (filtroTipoInf !== "Tutti") {
      const tipoAttivo = a.tipoInfortunio === filtroTipoInf;
      const tipoStorico = (a.storicoInfortuni ?? []).some((s) => s.tipo === filtroTipoInf);
      if (!tipoAttivo && !tipoStorico) return false;
    }
    return true;
  }).sort((a, b) => a.stato === b.stato ? nd(a).localeCompare(nd(b)) : a.stato === "Infortunato" ? -1 : 1);

  const statoColor: Record<string, string> = {
    "Infortunato": "bg-orange-100 text-orange-700",
    "Disponibile": "bg-green-100 text-green-700",
  };

  const handleExport = async (tipo: "excel" | "pdf") => {
    const key = tab + tipo;
    setEsportando(key);
    try {
      if (tab === "overview") {
        const params = { atleti, programmi, perCategoria, perTipoInfortunio, perInfortunio, trendMensile };
        if (tipo === "excel") await esportaExcelPanoramica(params);
        else await esportaPDFPanoramica(params);
      } else {
        if (tipo === "excel") await esportaExcelReport(atletiMese, reportMese, reportAnno, filtroCat, filtroTipoInf !== "Tutti" ? filtroTipoInf : "", mesiPeriodo, periodoLabel);
        else await esportaPDFReport(atletiMese, reportMese, reportAnno, filtroCat, filtroTipoInf !== "Tutti" ? filtroTipoInf : "", atleti, mesiPeriodo, periodoLabel);
      }
    } finally {
      setEsportando(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analisi</h1>
          <p className="text-gray-500 mt-1">Statistiche e report infortuni</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Export buttons */}
          <div className="flex gap-2">
            <button onClick={() => handleExport("excel")} disabled={!!esportando}
              className="flex items-center gap-1.5 border border-green-300 text-green-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-green-50 disabled:opacity-50 transition-colors">
              <Download className="w-3.5 h-3.5" />
              {esportando?.includes("excel") ? "..." : "Excel"}
            </button>
            <button onClick={() => handleExport("pdf")} disabled={!!esportando}
              className="flex items-center gap-1.5 border border-red-200 text-[#C8102E] px-3 py-2 rounded-xl text-xs font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors">
              <FileText className="w-3.5 h-3.5" />
              {esportando?.includes("pdf") ? "..." : "PDF"}
            </button>
          </div>
          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(["overview", "report"] as AnalisiTab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}>
                {t === "overview" ? "Panoramica" : "Report"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Atleti totali" value={atleti.length} sub="in gestione" icon={Users} color="bg-[#2B2B2B]" />
            <StatCard label="In riabilitazione" value={attivi.length} sub="attualmente attivi" icon={Activity} color="bg-orange-500" />
            <StatCard label="Guariti" value={guariti.length} sub="completato percorso" icon={TrendingUp} color="bg-green-500" />
            <StatCard label="Programmi totali" value={programmi.length} sub="sessioni create" icon={BarChart2} color="bg-[#C8102E]" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Atleti per categoria */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-1">Atleti per categoria</h2>
              <p className="text-xs text-gray-400 mb-5">Totale iscritti e in riabilitazione attiva</p>
              {perCategoria.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Nessun atleta ancora</p>
              ) : (
                <div className="space-y-3">
                  {perCategoria.map(({ cat, totale, attivi: a }) => {
                    const totalAttivi = attivi.length;
                    const pctInf = totalAttivi > 0 ? Math.round((a / totalAttivi) * 100) : 0;
                    const pctTot = atleti.length > 0 ? Math.round((totale / atleti.length) * 100) : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{cat}</span>
                            {a > 0 && (
                              <span className="bg-red-50 text-[#C8102E] font-bold px-1.5 py-0.5 rounded-md text-[10px]">
                                {pctInf}% infortuni
                              </span>
                            )}
                          </div>
                          <span>{a} attivi / {totale} totali · <span className="font-semibold">{pctTot}%</span></span>
                        </div>
                        <div className="h-5 bg-gray-100 rounded-full overflow-hidden flex">
                          <div className="h-full bg-[#C8102E] rounded-full transition-all duration-500"
                            style={{ width: `${(a / maxCat) * 100}%` }} />
                          <div className="h-full bg-gray-200 rounded-full transition-all duration-500"
                            style={{ width: `${((totale - a) / maxCat) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4 pt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#C8102E] inline-block" />In riabilitazione</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />Guariti</span>
                  </div>
                </div>
              )}
            </div>

            {/* Categorie infortunio */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-1">Categorie di infortunio</h2>
              <p className="text-xs text-gray-400 mb-5">Distribuzione per tipo (muscolare, tendineo, osseo…)</p>
              {perTipoInfortunio.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm">Nessun dato ancora</p>
                  <p className="text-gray-300 text-xs mt-1">Compila il "Tipo infortunio" nella scheda atleta</p>
                </div>
              ) : (() => {
                const totalTipo = perTipoInfortunio.reduce((s, x) => s + x.count, 0);
                return (
                  <div className="space-y-3">
                    {perTipoInfortunio.map(({ nome, count }) => {
                      const pct = totalTipo > 0 ? Math.round((count / totalTipo) * 100) : 0;
                      return (
                        <BarraOrizzontale key={nome} label={nome} value={count} max={maxTipo}
                          color="bg-gray-300" sub={`${pct}%`} />
                      );
                    })}
                  </div>
                );
              })()}
              {perInfortunio.length > 0 && (
                <div className="border-t border-gray-100 mt-5 pt-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Diagnosi specifiche più frequenti</p>
                  <div className="space-y-3">
                    {perInfortunio.map(({ nome, count }) => (
                      <BarraOrizzontale key={nome} label={nome} value={count} max={maxInf}
                        sub={count === 1 ? "1 atleta" : `${count} atleti`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Infortuni per squadra */}
          {infPerSquadra.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-bold text-gray-900">Infortuni attivi per squadra</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Per categoria e tipologia, con percentuali</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{attivi.length}</p>
                  <p className="text-xs text-gray-400">totale infortuni</p>
                </div>
              </div>
              <div className="space-y-5">
                {infPerSquadra.map(({ cat, total, pct, tipi }) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{cat}</span>
                      <span className="text-xs text-gray-500">
                        {total} infort. · <span className="font-bold text-[#C8102E]">{pct}% del totale</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full mb-2.5 overflow-hidden">
                      <div className="h-full bg-[#C8102E] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tipi.map(({ nome, count, pct: tipoPct }) => (
                        <span key={nome} className="inline-flex items-center gap-1 text-[11px] bg-gray-50 border border-gray-200 text-gray-700 px-2 py-1 rounded-lg">
                          {nome}
                          <span className="font-bold text-gray-900">{count}</span>
                          <span className="text-gray-400">({tipoPct}%)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trend mensile */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-1">Atleti in riabilitazione – ultimi 12 mesi</h2>
            <p className="text-xs text-gray-400 mb-5">Numero di atleti attivi per ogni mese del periodo</p>
            {atleti.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Nessun dato disponibile</p>
            ) : (
              <div className="overflow-x-auto -mx-2 px-2 pb-1">
                <div className="flex items-end gap-1.5 pt-4" style={{ minWidth: "420px", height: "140px" }}>
                  {trendMensile.map(({ label, count }, idx) => {
                    const [nomeMese, annoLabel] = label.split(" ");
                    const showAnno = !!annoLabel && (idx === 0 || !trendMensile[idx - 1].label.includes(annoLabel));
                    const h = maxTrend > 0 ? Math.max((count / maxTrend) * 100, count > 0 ? 8 : 0) : 0;
                    const isOggi = label.startsWith(MESI[oggi.getMonth()]) && !label.includes(String(oggi.getFullYear() - 1));
                    return (
                      <div key={label} className="flex-1 flex flex-col items-center gap-0.5" style={{ minWidth: "28px" }}>
                        <span className="text-[10px] font-bold text-gray-600">{count > 0 ? count : ""}</span>
                        <div className="w-full flex items-end" style={{ height: "72px" }}>
                          <div className={`w-full rounded-t transition-all duration-500 ${isOggi ? "bg-[#C8102E]" : "bg-gray-200"}`}
                            style={{ height: `${h}%` }} />
                        </div>
                        <span className="text-[9px] text-gray-400 text-center leading-none font-medium">{nomeMese}</span>
                        {showAnno && <span className="text-[8px] text-gray-300 text-center leading-none">{annoLabel}</span>}
                        {!showAnno && <span className="text-[8px] leading-none">&nbsp;</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Distribuzione mensile per categoria e tipologia */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-1">Distribuzione mensile – squadra e tipologia</h2>
            <p className="text-xs text-gray-400 mb-5">Atleti attivi ogni mese, suddivisi per categoria e per tipo di infortunio</p>
            {atleti.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Nessun dato disponibile</p>
            ) : (
              <div className="overflow-x-auto -mx-2 px-2 pb-1">
                <div style={{ minWidth: "420px" }}>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Per squadra</p>
                  <div className="flex gap-1 items-end" style={{ height: "72px" }}>
                    {trendCombinato.months.map(({ label, total, perCat }) => {
                      const barH = Math.max((total / trendCombinato.maxVal) * 56, total > 0 ? 3 : 0);
                      return (
                        <div key={label} className="flex-1 flex flex-col items-center justify-end gap-0.5" style={{ minWidth: "22px" }}>
                          {total > 0 && <span className="text-[8px] font-bold text-gray-500">{total}</span>}
                          <div className="w-full flex flex-col-reverse overflow-hidden rounded-t"
                            style={{ height: `${barH}px`, backgroundColor: "#F3F4F6" }}>
                            {trendCombinato.catPresenti.map((cat) => {
                              const cnt = perCat[cat] ?? 0;
                              if (!cnt) return null;
                              return <div key={cat} style={{ height: `${(cnt / trendCombinato.maxVal) * 56}px`, backgroundColor: trendCombinato.catColorMap[cat], flexShrink: 0 }} />;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-1.5">Per tipo di infortunio</p>
                  <div className="flex gap-1 items-end" style={{ height: "72px" }}>
                    {trendCombinato.months.map(({ label, total, perTipo }) => {
                      const barH = Math.max((total / trendCombinato.maxVal) * 56, total > 0 ? 3 : 0);
                      return (
                        <div key={label} className="flex-1 flex flex-col items-center justify-end gap-0.5" style={{ minWidth: "22px" }}>
                          {total > 0 && <span className="text-[8px] font-bold text-gray-500">{total}</span>}
                          <div className="w-full flex flex-col-reverse overflow-hidden rounded-t"
                            style={{ height: `${barH}px`, backgroundColor: "#F3F4F6" }}>
                            {trendCombinato.tipiPresenti.map((tipo) => {
                              const cnt = perTipo[tipo] ?? 0;
                              if (!cnt) return null;
                              return <div key={tipo} style={{ height: `${(cnt / trendCombinato.maxVal) * 56}px`, backgroundColor: trendCombinato.tipoColorMap[tipo], flexShrink: 0 }} />;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {trendCombinato.months.map(({ nomeMese, label }) => (
                      <div key={label} className="flex-1 text-center" style={{ minWidth: "22px" }}>
                        <span className="text-[8px] text-gray-400">{nomeMese}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              {trendCombinato.catPresenti.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {trendCombinato.catPresenti.map((cat) => (
                    <span key={cat} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: trendCombinato.catColorMap[cat] }} />
                      {cat}
                    </span>
                  ))}
                </div>
              )}
              {trendCombinato.tipiPresenti.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {trendCombinato.tipiPresenti.map((tipo) => (
                    <span key={tipo} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: trendCombinato.tipoColorMap[tipo] }} />
                      {tipo}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Progressi medi */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-1">Progresso medio di recupero per categoria</h2>
            <p className="text-xs text-gray-400 mb-5">Tutti gli atleti – inclusi guariti (100%)</p>
            {atleti.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Nessun atleta ancora</p>
            ) : (
              <div className="space-y-3">
                {CATEGORIE.map((cat) => {
                  const lista = atleti.filter((a) => a.categoria === cat);
                  if (!lista.length) return null;
                  const media = Math.round(lista.reduce((s, a) => s + a.progresso, 0) / lista.length);
                  const nAttivi = lista.filter((a) => a.stato !== "Disponibile").length;
                  const nGuariti = lista.length - nAttivi;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span className="font-semibold">{cat}</span>
                        <span className="font-bold text-[#C8102E]">{media}%
                          {nGuariti > 0 && <span className="text-gray-400 font-normal ml-1">({nAttivi} attivi · {nGuariti} guariti)</span>}
                        </span>
                      </div>
                      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${
                          media >= 75 ? "bg-green-500" : media >= 40 ? "bg-yellow-400" : "bg-orange-500"
                        }`} style={{ width: `${media}%` }} />
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            )}
          </div>

          {/* Lista completa atleti */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Lista completa atleti</h2>
                <p className="text-xs text-gray-400 mt-0.5">Tutti gli atleti in gestione, inclusi i guariti</p>
              </div>
              <span className="text-sm font-bold text-[#C8102E]">{atleti.length} atleti</span>
            </div>
            {atleti.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nessun atleta ancora</p>
              </div>
            ) : (
              <>
                <div className="hidden md:grid grid-cols-5 px-5 py-2 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <span className="col-span-2">Atleta</span>
                  <span>Infortunio</span>
                  <span className="text-center">Stato</span>
                  <span className="text-right">Progresso</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {[...atleti]
                    .sort((a, b) => a.stato === b.stato ? nd(a).localeCompare(nd(b)) : a.stato === "Infortunato" ? -1 : 1)
                    .map((a) => (
                      <div key={a.id} className="grid grid-cols-1 md:grid-cols-5 items-center px-5 py-4 hover:bg-gray-50 gap-2">
                        <div className="col-span-2 flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {nd(a).trim().split(/\s+/).filter(Boolean).slice(0,2).map((w:string)=>(w[0]??"").toUpperCase()).join("")}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{nd(a)}</p>
                            <p className="text-xs text-gray-400">{a.categoria}{a.tipoInfortunio ? ` · ${a.tipoInfortunio}` : ""}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {a.infortunio || (a.storicoInfortuni ?? []).at(-1)?.diagnosi || "—"}
                        </p>
                        <div className="flex md:justify-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statoColor[a.stato]}`}>{a.stato}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-bold text-gray-900">{a.progresso}%</span>
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${a.progresso >= 75 ? "bg-green-500" : a.progresso >= 40 ? "bg-yellow-400" : "bg-orange-500"}`}
                              style={{ width: `${a.progresso}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Report */
        <div className="space-y-5">
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
                    {MESI_LUNGHI.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                </div>
              )}
              {tipoReport !== "mensile" && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mese inizio</label>
                    <select value={stagioneMeseInizio} onChange={(e) => setStagioneMeseInizio(Number(e.target.value))}
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
                      {MESI_LUNGHI.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mese fine</label>
                    <select value={stagioneMeseFine} onChange={(e) => setStagioneMeseFine(Number(e.target.value))}
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
                      {MESI_LUNGHI.map((m, i) => <option key={m} value={i}>{m}</option>)}
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
                <select value={filtroTipoInf} onChange={(e) => setFiltroTipoInf(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
                  <option value="Tutti">Tutti</option>
                  {TIPI_INFORTUNIO.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {CATEGORIE.map((cat) => {
              const n = atletiMese.filter((a) => a.categoria === cat).length;
              if (!n) return null;
              return (
                <div key={cat} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
                  <p className="text-xs font-bold text-[#C8102E] uppercase tracking-widest">{cat}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{n}</p>
                  <p className="text-xs text-gray-400">atleti</p>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">
                {periodoLabel}
                {filtroCat !== "Tutte" && ` · ${filtroCat}`}
                {filtroTipoInf !== "Tutti" && ` · ${filtroTipoInf}`}
              </h2>
              <span className="text-sm font-bold text-[#C8102E]">{atletiMese.length} atleti</span>
            </div>

            {atletiMese.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nessun atleta trovato</p>
              </div>
            ) : (
              <>
                <div className="hidden md:grid grid-cols-5 px-5 py-2 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <span className="col-span-2">Atleta</span>
                  <span>Infortunio</span>
                  <span className="text-center">Stato</span>
                  <span className="text-right">Progresso</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {atletiMese.map((a) => {
                    const infortuni = infortunitNelPeriodo(a, mesiPeriodo);
                    return (
                      <div key={a.id} className="grid grid-cols-1 md:grid-cols-5 items-start px-5 py-4 hover:bg-gray-50 gap-2">
                        <div className="col-span-2 flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {nd(a).trim().split(/\s+/).filter(Boolean).slice(0,2).map((w:string)=>(w[0]??"").toUpperCase()).join("")}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{nd(a)}</p>
                            <p className="text-xs text-gray-400">{a.categoria}</p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {infortuni.length === 0 ? (
                            <p className="text-sm text-gray-400">—</p>
                          ) : (
                            infortuni.map((inf, i) => (
                              <div key={i}>
                                <p className="text-sm text-gray-700 font-medium leading-snug">{inf.diagnosi}</p>
                                <p className="text-xs text-gray-400">
                                  {inf.tipo ? `${inf.tipo} · ` : ""}
                                  {inf.inizio ? new Date(inf.inizio + "T12:00").toLocaleDateString("it-IT") : ""}
                                  {inf.fine ? ` → ${new Date(inf.fine + "T12:00").toLocaleDateString("it-IT")}` : ""}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="flex md:justify-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statoColor[a.stato]}`}>
                            {a.stato}
                          </span>
                        </div>
                        <div className="md:text-right">
                          <span className="text-lg font-bold text-[#C8102E]">{a.progresso}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

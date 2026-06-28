"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart2, Users, Activity, TrendingUp, Calendar, Download, FileText } from "lucide-react";
import { loadAtleti, loadProgrammi, CATEGORIE, TIPI_INFORTUNIO, type Atleta, type Programma } from "@/lib/store";

const MESI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const MESI_LUNGHI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

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

function atletaAttivoInMese(a: Atleta, anno: number, mese: number): boolean {
  if (!a.inizioRehab) return false;
  const inizio = new Date(a.inizioRehab + "T12:00");
  const meseStart = new Date(anno, mese, 1);
  const meseEnd = new Date(anno, mese + 1, 0);
  if (inizio > meseEnd) return false;
  if (a.stato === "Disponibile") {
    if (a.fineRehab) return new Date(a.fineRehab + "T12:00") >= meseStart;
    return inizio >= meseStart;
  }
  return true;
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
  xlAddColHeaders(ws6, ["Categoria", "Atleti attivi", "Progresso medio"]);
  CATEGORIE.forEach((cat, i) => {
    const lista = params.atleti.filter((a) => a.categoria === cat && a.stato !== "Disponibile");
    if (!lista.length) return;
    const media = Math.round(lista.reduce((s, a) => s + a.progresso, 0) / lista.length);
    xlAddDataRow(ws6, [cat, lista.length, `${media}%`], i % 2 !== 0, [3]);
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
) {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "U.S. Cremonese Rehab Area";

  const oggi = new Date().toLocaleDateString("it-IT");
  const subtitle = [
    MESI_LUNGHI[mese], String(anno),
    filtroCat !== "Tutte" ? filtroCat : "",
    filtroTipoInf || "",
  ].filter(Boolean).join(" – ");

  const logoBuf = await getLogoArrayBuffer();
  const logoId = logoBuf ? wb.addImage({ buffer: logoBuf, extension: "png" }) : undefined;

  const ws = wb.addWorksheet("Report Mensile");
  ws.columns = [
    { width: 30 }, { width: 15 }, { width: 22 }, { width: 30 },
    { width: 18 }, { width: 14 }, { width: 14 }, { width: 13 },
    { width: 22 }, { width: 22 },
  ];

  xlAddSheetHeader(ws, wb, logoId, "REPORT MENSILE", subtitle, oggi);

  // Info totale
  ws.getRow(2).getCell(4).value = `Totale atleti: ${atletiMese.length}`;
  ws.getRow(2).getCell(4).font = { bold: true, size: 10, color: { argb: XL_DARK } };

  ws.addRow([]);

  // Intestazioni colonne
  xlAddColHeaders(ws, ["Nome", "Categoria", "Tipo Infortunio", "Diagnosi", "Stato", "Inizio Rehab", "Fine Rehab", "Progresso %"], xlDarkFill);

  // Righe dati
  atletiMese.forEach((a, i) => {
    xlAddDataRow(ws, [
      a.nome,
      a.categoria,
      a.tipoInfortunio ?? "—",
      a.infortunio || "—",
      a.stato,
      a.inizioRehab ? new Date(a.inizioRehab + "T12:00").toLocaleDateString("it-IT") : "—",
      a.fineRehab   ? new Date(a.fineRehab   + "T12:00").toLocaleDateString("it-IT") : "—",
      `${a.progresso}%`,
    ], i % 2 !== 0, [8]);
    // Diagnosi e Nome: allineamento sinistra
    const row = ws.getRow(ws.rowCount);
    row.getCell(4).alignment = { vertical: "middle", horizontal: "left" };
  });

  // Riepilogo per categoria
  ws.addRow([]);
  xlAddColHeaders(ws, ["Riepilogo per categoria", "", "N° atleti"]);
  CATEGORIE.forEach((cat, i) => {
    const n = atletiMese.filter((a) => a.categoria === cat).length;
    if (!n) return;
    xlAddDataRow(ws, [cat, "", n], i % 2 !== 0, [3]);
  });

  await xlSave(wb, `USC_Report_${MESI[mese]}_${anno}.xlsx`);
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
    doc.setTextColor(...red); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("U.S. Cremonese – Analisi Rehab Area", tx, 13);
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
    doc.text(oggi, W - M, 13, { align: "right" });
  };

  const secTitle = (text: string, y: number) => {
    doc.setFillColor(245, 245, 245); doc.rect(M, y - 4, W - M * 2, 8, "F");
    doc.setFillColor(...red); doc.rect(M, y - 4, 2.5, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...dark);
    doc.text(text.toUpperCase(), M + 5, y + 1.5);
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

  if (y > 200) { doc.addPage(); addHeader(); y = HDR + 12; }
  y = secTitle("Trend mensile – ultimi 12 mesi", y);
  autoTable(doc, {
    startY: y,
    head: [["Mese", "Atleti attivi"]],
    body: params.trendMensile.map(({ label, count }) => [label, count]),
    headStyles: { fillColor: red, textColor: 255, fontSize: 7.5 },
    bodyStyles: { fontSize: 8.5, cellPadding: 2.5, overflow: "ellipsize" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: M, right: W / 2 },
    columnStyles: { 0: { fontStyle: "bold", textColor: dark }, 1: {} },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  const progressiRows = CATEGORIE.map((cat) => {
    const lista = params.atleti.filter((a) => a.categoria === cat && a.stato !== "Disponibile");
    if (!lista.length) return null;
    const media = Math.round(lista.reduce((s, a) => s + a.progresso, 0) / lista.length);
    return [cat, lista.length, `${media}%`];
  }).filter(Boolean) as any[][];

  if (progressiRows.length > 0) {
    if (y > 220) { doc.addPage(); addHeader(); y = HDR + 12; }
    y = secTitle("Progresso medio di recupero per categoria", y);
    autoTable(doc, {
      startY: y,
      head: [["Categoria", "Atleti attivi", "Progresso medio"]],
      body: progressiRows,
      headStyles: { fillColor: dark, textColor: 255, fontSize: 7.5 },
      bodyStyles: { fontSize: 8.5, cellPadding: 2.5, overflow: "ellipsize", halign: "left", valign: "middle" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: M, right: M },
      columnStyles: { 0: { fontStyle: "bold", textColor: dark }, 1: {}, 2: {} },
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
    doc.setTextColor(...red); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("U.S. Cremonese – Report Mensile", tx, 13);
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
    doc.text(oggi, W - M, 13, { align: "right" });
  };

  const secTitle = (text: string, y: number) => {
    doc.setFillColor(245, 245, 245); doc.rect(M, y - 4, W - M * 2, 8, "F");
    doc.setFillColor(...red); doc.rect(M, y - 4, 2.5, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...dark);
    doc.text(text.toUpperCase(), M + 5, y + 1.5);
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

  const titolo = `${MESI_LUNGHI[mese]} ${anno}`;
  const filtri = [filtroCat !== "Tutte" ? filtroCat : "", filtroTipoInf || ""].filter(Boolean).join("  ·  ");
  doc.setTextColor(...dark); doc.setFontSize(17); doc.setFont("helvetica", "bold");
  doc.text(titolo, M, HDR + 13);
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

  y = secTitle("Dettaglio atleti", y);
  autoTable(doc, {
    startY: y,
    head: [["Atleta", "Categoria", "Tipo Infort.", "Diagnosi", "Stato", "Inizio", "Fine", "%"]],
    body: atletiMese.map((a) => [
      a.nome, a.categoria, a.tipoInfortunio ?? "—", a.infortunio || "—", a.stato,
      a.inizioRehab ? new Date(a.inizioRehab + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—",
      a.fineRehab   ? new Date(a.fineRehab   + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—",
      `${a.progresso}%`,
    ]),
    headStyles: { fillColor: dark, textColor: 255, fontSize: 7.5 },
    bodyStyles: { fontSize: 8, cellPadding: 2.5, halign: "left", valign: "middle" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: M, right: M },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 24 },
      2: { cellWidth: 58 },
      3: { cellWidth: 55 },
      4: { cellWidth: 28 },
      5: { cellWidth: 20 },
      6: { cellWidth: 20 },
      7: { cellWidth: 22 },
    },
  });

  addFooter();
  doc.save(`USC_Report_${MESI[mese]}_${anno}.pdf`);
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

  useEffect(() => {
    loadAtleti().then(setAtleti);
    loadProgrammi().then(setProgrammi);
  }, []);

  const attivi = atleti.filter((a) => a.stato !== "Disponibile");
  const guariti = atleti.filter((a) => a.stato === "Disponibile");

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
    });
    return Object.entries(map).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).map(([nome, count]) => ({ nome, count }));
  }, [atleti]);

  const perInfortunio = useMemo(() => {
    const map: Record<string, number> = {};
    atleti.forEach((a) => { if (a.infortunio) map[a.infortunio.trim()] = (map[a.infortunio.trim()] ?? 0) + 1; });
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

  const anni = Array.from({ length: 5 }, (_, i) => oggi.getFullYear() - 2 + i);
  const atletiMese = atleti.filter((a) => {
    if (!atletaAttivoInMese(a, reportAnno, reportMese)) return false;
    if (filtroCat !== "Tutte" && a.categoria !== filtroCat) return false;
    if (filtroTipoInf !== "Tutti" && a.tipoInfortunio !== filtroTipoInf) return false;
    return true;
  });

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
        if (tipo === "excel") await esportaExcelReport(atletiMese, reportMese, reportAnno, filtroCat, filtroTipoInf !== "Tutti" ? filtroTipoInf : "");
        else await esportaPDFReport(atletiMese, reportMese, reportAnno, filtroCat, filtroTipoInf !== "Tutti" ? filtroTipoInf : "");
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
                {t === "overview" ? "Panoramica" : "Report mensile"}
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
                  {perCategoria.map(({ cat, totale, attivi: a }) => (
                    <div key={cat}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span className="font-semibold">{cat}</span>
                        <span>{a} attivi / {totale} totali</span>
                      </div>
                      <div className="h-5 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-[#C8102E] rounded-full transition-all duration-500"
                          style={{ width: `${(a / maxCat) * 100}%` }} />
                        <div className="h-full bg-gray-200 rounded-full transition-all duration-500"
                          style={{ width: `${((totale - a) / maxCat) * 100}%` }} />
                      </div>
                    </div>
                  ))}
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
              ) : (
                <div className="space-y-3">
                  {perTipoInfortunio.map(({ nome, count }) => (
                    <BarraOrizzontale key={nome} label={nome} value={count} max={maxTipo}
                      color="bg-gray-300" sub={count === 1 ? "1 atleta" : `${count} atleti`} />
                  ))}
                </div>
              )}
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

          {/* Trend mensile */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-1">Atleti in riabilitazione – ultimi 12 mesi</h2>
            <p className="text-xs text-gray-400 mb-5">Numero di atleti attivi per ogni mese del periodo</p>
            {atleti.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Nessun dato disponibile</p>
            ) : (
              <div className="flex items-end gap-2 h-40 pt-4">
                {trendMensile.map(({ label, count }) => {
                  const h = maxTrend > 0 ? Math.max((count / maxTrend) * 100, count > 0 ? 8 : 0) : 0;
                  const isOggi = label.startsWith(MESI[oggi.getMonth()]) && !label.includes(String(oggi.getFullYear() - 1));
                  return (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-gray-600">{count > 0 ? count : ""}</span>
                      <div className="w-full flex items-end" style={{ height: "80px" }}>
                        <div className={`w-full rounded-t-lg transition-all duration-500 ${isOggi ? "bg-[#C8102E]" : "bg-gray-200"}`}
                          style={{ height: `${h}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 text-center leading-tight">{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Progressi medi */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-1">Progresso medio di recupero per categoria</h2>
            <p className="text-xs text-gray-400 mb-5">Calcolato sugli atleti attualmente in riabilitazione</p>
            {attivi.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Nessun atleta attivo</p>
            ) : (
              <div className="space-y-3">
                {CATEGORIE.map((cat) => {
                  const lista = attivi.filter((a) => a.categoria === cat);
                  if (!lista.length) return null;
                  const media = Math.round(lista.reduce((s, a) => s + a.progresso, 0) / lista.length);
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span className="font-semibold">{cat}</span>
                        <span className="font-bold text-[#C8102E]">{media}%</span>
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
        </div>
      ) : (
        /* Report mensile */
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-[#C8102E]" />
              <h2 className="font-bold text-gray-900">Seleziona periodo e filtri</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mese</label>
                <select value={reportMese} onChange={(e) => setReportMese(Number(e.target.value))}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
                  {MESI_LUNGHI.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Anno</label>
                <select value={reportAnno} onChange={(e) => setReportAnno(Number(e.target.value))}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
                  {anni.map((a) => <option key={a}>{a}</option>)}
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
                {MESI_LUNGHI[reportMese]} {reportAnno}
                {filtroCat !== "Tutte" && ` · ${filtroCat}`}
                {filtroTipoInf !== "Tutti" && ` · ${filtroTipoInf}`}
              </h2>
              <span className="text-sm font-bold text-[#C8102E]">{atletiMese.length} atleti</span>
            </div>

            {atletiMese.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nessun atleta attivo in questo periodo</p>
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
                  {atletiMese.map((a) => (
                    <div key={a.id} className="grid grid-cols-1 md:grid-cols-5 items-center px-5 py-4 hover:bg-gray-50 gap-2">
                      <div className="col-span-2 flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {a.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{a.nome}</p>
                          <p className="text-xs text-gray-400">{a.categoria}{a.tipoInfortunio ? ` · ${a.tipoInfortunio}` : ""}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{a.infortunio || "—"}</p>
                      <div className="flex md:justify-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statoColor[a.stato]}`}>
                          {a.stato}
                        </span>
                      </div>
                      <div className="md:text-right">
                        <span className="text-lg font-bold text-[#C8102E]">{a.progresso}%</span>
                        <p className="text-xs text-gray-400">
                          {a.inizioRehab ? new Date(a.inizioRehab + "T12:00").toLocaleDateString("it-IT") : "—"}
                          {a.fineRehab ? ` → ${new Date(a.fineRehab + "T12:00").toLocaleDateString("it-IT")}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

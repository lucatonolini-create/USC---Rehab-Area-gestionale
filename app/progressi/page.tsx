"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Download, FileText, Calendar, Filter } from "lucide-react";
import {
  loadAtleti, loadProgrammi, upsertAtleta,
  CATEGORIE, type Atleta, type Stato, type Programma,
} from "@/lib/store";

const STATI: Stato[] = ["In recupero", "Quasi guarito", "Guarito"];
const statoColor: Record<Stato, string> = {
  "In recupero":  "bg-blue-100 text-blue-700",
  "Quasi guarito":"bg-green-100 text-green-700",
  "Guarito":      "bg-gray-100 text-gray-600",
};

async function getLogoBuffer(): Promise<ArrayBuffer | null> {
  try { const r = await fetch("/logo.png"); return r.ok ? r.arrayBuffer() : null; } catch { return null; }
}
async function getLogoDataUrl(): Promise<string | null> {
  try {
    const r = await fetch("/logo.png"); if (!r.ok) return null;
    const blob = await r.blob();
    return new Promise<string>((res, rej) => { const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.onerror = rej; rd.readAsDataURL(blob); });
  } catch { return null; }
}

async function esportaExcel(atleta: Atleta, programmi: Programma[]) {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "U.S. Cremonese Rehab Area";
  const oggi = new Date().toLocaleDateString("it-IT");

  const XL_RED  = "FFC8102E";
  const XL_DARK = "FF2B2B2B";
  const XL_LIGHT = "FFF5F5F5";
  const redFill  = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: XL_RED } };
  const darkFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: XL_DARK } };
  const lightFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: XL_LIGHT } };
  const whiteFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFFFF" } };
  const border = { top: { style: "thin" as const, color: { argb: "FFE0E0E0" } }, bottom: { style: "thin" as const, color: { argb: "FFE0E0E0" } }, left: { style: "thin" as const, color: { argb: "FFE0E0E0" } }, right: { style: "thin" as const, color: { argb: "FFE0E0E0" } } };

  const logoBuf = await getLogoBuffer();
  const logoId = logoBuf ? wb.addImage({ buffer: logoBuf, extension: "png" }) : undefined;

  const addHeader = (ws: any, subtitle: string) => {
    ws.getRow(1).height = 26; ws.getRow(2).height = 18; ws.getRow(3).height = 15; ws.getRow(4).height = 8;
    if (logoId !== undefined) ws.addImage(logoId, { tl: { col: 0, row: 0 }, br: { col: 0.92, row: 3.8 }, editAs: "oneCell" });
    const r1 = ws.getRow(1); r1.getCell(2).value = "U.S. CREMONESE – REHAB AREA"; r1.getCell(2).font = { bold: true, size: 13, color: { argb: XL_RED } };
    const r2 = ws.getRow(2); r2.getCell(2).value = "SCHEDA RIABILITATIVA"; r2.getCell(2).font = { bold: true, size: 10, color: { argb: XL_RED } };
    const r3 = ws.getRow(3); r3.getCell(2).value = subtitle; r3.getCell(2).font = { size: 9, italic: true, color: { argb: "FF999999" } };
    ws.getRow(3).getCell(3).value = `Generato il ${oggi}`; ws.getRow(3).getCell(3).font = { size: 9, color: { argb: "FF999999" } }; ws.getRow(3).getCell(3).alignment = { horizontal: "right" };
  };

  const addSectionTitle = (ws: any, text: string, fill = darkFill) => {
    const row = ws.addRow([text]);
    row.height = 20;
    row.getCell(1).fill = fill;
    row.getCell(1).font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    row.getCell(1).border = border;
    ws.mergeCells(row.number, 1, row.number, 8);
    return row;
  };

  const addDataRow = (ws: any, label: string, value: string, odd: boolean) => {
    const row = ws.addRow([label, value]);
    row.height = 18;
    [1, 2].forEach((col) => { row.getCell(col).fill = odd ? lightFill : whiteFill; row.getCell(col).border = border; row.getCell(col).alignment = { vertical: "middle" }; });
    row.getCell(1).font = { bold: true, size: 9, color: { argb: XL_DARK } };
    row.getCell(2).font = { size: 9, color: { argb: XL_DARK } };
  };

  // ── Foglio Atleta ────────────────────────────────────────────────────────────
  const ws1 = wb.addWorksheet("Atleta");
  ws1.columns = [{ width: 28 }, { width: 40 }, { width: 20 }];
  addHeader(ws1, atleta.nome);
  ws1.addRow([]);
  addSectionTitle(ws1, "DATI PERSONALI", redFill);
  [
    ["Nome", atleta.nome],
    ["Data di nascita", atleta.dataNascita ? new Date(atleta.dataNascita + "T12:00").toLocaleDateString("it-IT") : "—"],
    ["Categoria", atleta.categoria],
    ["Ruolo", atleta.posizione],
    ["Piede dominante", atleta.piedeDominante],
    ["Infortunio", atleta.infortunio || "—"],
    ["Inizio riabilitazione", atleta.inizioRehab ? new Date(atleta.inizioRehab + "T12:00").toLocaleDateString("it-IT") : "—"],
    ["Fine riabilitazione", atleta.fineRehab ? new Date(atleta.fineRehab + "T12:00").toLocaleDateString("it-IT") : "—"],
    ["Fisioterapista", atleta.fisioterapista || "—"],
    ["Stato attuale", atleta.stato],
    ["Progresso recupero", `${atleta.progresso}%`],
    ["Note", atleta.note || "—"],
  ].forEach(([l, v], i) => addDataRow(ws1, l, v, i % 2 !== 0));

  // ── Fogli programmi ──────────────────────────────────────────────────────────
  programmi.forEach((prog, idx) => {
    const ws = wb.addWorksheet(`Prog ${idx + 1}`.slice(0, 31));
    ws.columns = [{ width: 6 }, { width: 32 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 8 }, { width: 10 }, { width: 24 }];
    addHeader(ws, `${prog.nome}${prog.fase ? ` – ${prog.fase}` : ""}`);
    ws.getRow(3).getCell(2).value = prog.data ? new Date(prog.data + "T12:00").toLocaleDateString("it-IT") : "";
    ws.addRow([]);

    addSectionTitle(ws, "ESERCIZI", darkFill);
    const hRow = ws.addRow(["#", "Esercizio", "Serie", "Reps/Durata", "Carico", "RIR", "VAS", "Note"]);
    hRow.height = 20;
    hRow.eachCell((cell: any) => { cell.fill = redFill; cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } }; cell.border = border; cell.alignment = { vertical: "middle", horizontal: "center" }; });
    hRow.getCell(2).alignment = { vertical: "middle", horizontal: "left" };

    prog.esercizi.forEach((e, i) => {
      const row = ws.addRow([i + 1, e.nome, e.serie || "—", e.reps || "—", e.carico || "—", e.rir || "—", e.vas ? `${e.vas}/10` : "—", e.note || ""]);
      row.height = 18;
      row.eachCell({ includeEmpty: true }, (cell: any, col: number) => { cell.fill = i % 2 !== 0 ? lightFill : whiteFill; cell.border = border; cell.font = { size: 9 }; cell.alignment = { vertical: "middle", horizontal: col === 2 ? "left" : "center" }; });
    });

    if (prog.carico && Object.values(prog.carico).some(Boolean)) {
      ws.addRow([]);
      addSectionTitle(ws, "CARICO SESSIONE", darkFill);
      const c = prog.carico;
      const caricoRows: [string, string][] = [];
      if (c.rpe) caricoRows.push(["RPE sessione", `${c.rpe}/10`]);
      if (c.durata) caricoRows.push(["Durata", `${c.durata} min`]);
      if (c.interno) caricoRows.push(["Carico interno", c.interno]);
      if (c.esterno) caricoRows.push(["Carico esterno", c.esterno]);
      if (c.distanzaTotale) caricoRows.push(["Distanza totale", `${c.distanzaTotale} km`]);
      if (c.velocitaMax) caricoRows.push(["Velocità max", `${c.velocitaMax} km/h`]);
      if (c.hsr) caricoRows.push(["HSR (>19 km/h)", `${c.hsr} m`]);
      if (c.accelerazioni) caricoRows.push(["Accelerazioni", c.accelerazioni]);
      caricoRows.forEach(([l, v], i) => addDataRow(ws, l, v, i % 2 !== 0));
    }

    if (prog.tests?.length) {
      ws.addRow([]);
      addSectionTitle(ws, "TEST FISIOMETRICI E DI PERFORMANCE", darkFill);
      prog.tests.forEach((t, i) => {
        const row = ws.addRow([i + 1, t.nome, t.risultato, t.unita, t.note]);
        row.height = 18;
        row.eachCell({ includeEmpty: true }, (cell: any) => { cell.fill = i % 2 !== 0 ? lightFill : whiteFill; cell.border = border; cell.font = { size: 9 }; });
      });
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${atleta.nome.replace(/ /g, "_")}_rehab.xlsx`; a.click();
  URL.revokeObjectURL(url);
}

async function esportaPDF(atleta: Atleta, programmi: Programma[]) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  const red: [number, number, number] = [200, 16, 46];
  const dark: [number, number, number] = [43, 43, 43];
  const gray: [number, number, number] = [130, 130, 130];
  const logoDataUrl = await getLogoDataUrl();
  const oggi = new Date().toLocaleDateString("it-IT");
  const M = 14; const W = 210; const H = 297; const HDR = 30;

  const addHeader = (subtitle?: string) => {
    doc.setFillColor(247, 247, 247);
    doc.rect(0, 0, W, HDR, "F");
    doc.setDrawColor(...red); doc.setLineWidth(0.4); doc.line(0, HDR, W, HDR);
    if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 4, 4, 22, 22);
    const tx = logoDataUrl ? 30 : M;
    doc.setTextColor(...red); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("U.S. Cremonese – Scheda Riabilitativa", tx, 13);
    if (subtitle) { doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray); doc.text(subtitle, tx, 21); }
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

  // ── Pagina 1: dati atleta ──────────────────────────────────────────────────
  addHeader();
  doc.setTextColor(...dark); doc.setFontSize(17); doc.setFont("helvetica", "bold");
  doc.text(atleta.nome, M, HDR + 13);
  const info = [atleta.categoria, atleta.posizione, atleta.piedeDominante ? `Piede ${atleta.piedeDominante}` : ""].filter(Boolean).join("  ·  ");
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
  doc.text(info, M, HDR + 21);
  // badge stato
  doc.setFillColor(...red); doc.roundedRect(W - M - 36, HDR + 7, 36, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  doc.text(atleta.stato, W - M - 18, HDR + 13.5, { align: "center" });
  doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.3); doc.line(M, HDR + 27, W - M, HDR + 27);

  let y = HDR + 34;
  y = secTitle("Dati clinici", y);
  autoTable(doc, {
    startY: y,
    body: [
      ["Data di nascita", atleta.dataNascita ? new Date(atleta.dataNascita + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"],
      ["Tipo infortunio", atleta.tipoInfortunio || "—"],
      ["Diagnosi / Infortunio", atleta.infortunio || "—"],
      ["Inizio riabilitazione", atleta.inizioRehab ? new Date(atleta.inizioRehab + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"],
      ["Fine riabilitazione", atleta.fineRehab ? new Date(atleta.fineRehab + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"],
      ["Fisioterapista", atleta.fisioterapista || "—"],
      ["Preparatore atletico", atleta.preparatoreAtletico || "—"],
      ["Stato attuale", atleta.stato],
      ["Progresso recupero", `${atleta.progresso}%`],
    ],
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 3, overflow: "ellipsize" },
    columnStyles: { 0: { cellWidth: 58, fontStyle: "bold", textColor: dark }, 1: { textColor: dark } },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: M, right: M },
  });

  if (atleta.note) {
    y = (doc as any).lastAutoTable.finalY + 8;
    y = secTitle("Note", y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...dark);
    doc.text(doc.splitTextToSize(atleta.note, W - M * 2), M, y);
  }

  // ── Pagine programmi ────────────────────────────────────────────────────────
  programmi.forEach((prog) => {
    doc.addPage();
    const dataStr = prog.data ? new Date(prog.data + "T12:00").toLocaleDateString("it-IT") : "";
    addHeader(`${atleta.nome}  ·  ${prog.nome}${prog.fase ? ` – ${prog.fase}` : ""}${dataStr ? `  ·  ${dataStr}` : ""}`);
    y = HDR + 8;

    if (prog.esercizi?.length) {
      y = secTitle("Esercizi", y);
      autoTable(doc, {
        startY: y,
        head: [["#", "Esercizio", "Serie", "Reps", "Carico", "RIR", "VAS", "Note"]],
        body: prog.esercizi.map((e, i) => [i + 1, e.nome, e.serie || "—", e.reps || "—", e.carico || "—", e.rir || "—", e.vas ? `${e.vas}/10` : "—", e.note || ""]),
        headStyles: { fillColor: red, textColor: 255, fontSize: 7.5 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5, overflow: "ellipsize" },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: M, right: M },
        columnStyles: { 0: { cellWidth: 8, halign: "center" }, 1: { cellWidth: 50 }, 2: { cellWidth: 12, halign: "center" }, 3: { cellWidth: 18, halign: "center" }, 4: { cellWidth: 20, halign: "center" }, 5: { cellWidth: 10, halign: "center" }, 6: { cellWidth: 14, halign: "center" } },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (prog.carico?.rpe) {
      doc.setFillColor(255, 247, 237); doc.roundedRect(M, y, 50, 16, 2, 2, "F");
      doc.setFillColor(234, 88, 12); doc.rect(M, y, 2.5, 16, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(154, 52, 18);
      doc.text("RPE SESSIONE", M + 5, y + 6);
      doc.setFontSize(13); doc.text(`${prog.carico.rpe} / 10`, M + 5, y + 13);
      y += 22;
    }

    const hasCarico = prog.carico && Object.entries(prog.carico).some(([k, v]) => k !== "rpe" && v);
    if (hasCarico) {
      y = secTitle("Carico GPS", y);
      const c = prog.carico!;
      const rows: any[] = [];
      if (c.durata) rows.push(["Durata", `${c.durata} min`]);
      if (c.interno) rows.push(["Carico interno", c.interno]);
      if (c.esterno) rows.push(["Carico esterno", c.esterno]);
      if (c.distanzaTotale) rows.push(["Distanza totale", `${c.distanzaTotale} km`]);
      if (c.velocitaMax) rows.push(["Vel. max", `${c.velocitaMax} km/h`]);
      if (c.hsr) rows.push(["HSR (>19 km/h)", `${c.hsr} m`]);
      if (c.accelerazioni) rows.push(["Accelerazioni", c.accelerazioni]);
      if (rows.length) {
        autoTable(doc, { startY: y, body: rows, theme: "striped", styles: { fontSize: 8, cellPadding: 2.5, overflow: "ellipsize" }, columnStyles: { 0: { cellWidth: 45, fontStyle: "bold", textColor: dark } }, alternateRowStyles: { fillColor: [250, 250, 250] }, margin: { left: M, right: W / 2 } });
        y = (doc as any).lastAutoTable.finalY + 6;
      }
    }

    if (prog.tests?.length) {
      y = secTitle("Test fisiometrici e di performance", y);
      autoTable(doc, {
        startY: y,
        head: [["#", "Test", "Sx", "Dx", "Risultato", "Unità", "Note"]],
        body: prog.tests.map((t, i) => [i + 1, t.nome, t.risultatoSx || "—", t.risultatoDx || "—", t.risultato || "—", t.unita || "—", t.note || ""]),
        headStyles: { fillColor: dark, textColor: 255, fontSize: 7.5 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5, overflow: "ellipsize" },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: M, right: M },
        columnStyles: { 0: { cellWidth: 8, halign: "center" }, 1: { cellWidth: 52 }, 2: { cellWidth: 16, halign: "center" }, 3: { cellWidth: 16, halign: "center" }, 4: { cellWidth: 20, halign: "center" } },
      });
    }
  });

  addFooter();
  doc.save(`${atleta.nome.replace(/ /g, "_")}_rehab.pdf`);
}

async function esportaExcelReportMensile(atletiMese: Atleta[], mese: number, anno: number, filtroCat: string) {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "U.S. Cremonese Rehab Area";
  const oggi = new Date().toLocaleDateString("it-IT");
  const nomeMese = MESI[mese];
  const subtitle = `${nomeMese} ${anno}${filtroCat !== "Tutte" ? ` – ${filtroCat}` : ""}`;

  const XL_RED  = "FFC8102E"; const XL_DARK = "FF2B2B2B"; const XL_LIGHT = "FFF5F5F5";
  const redFill  = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: XL_RED } };
  const darkFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: XL_DARK } };
  const lightFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: XL_LIGHT } };
  const whiteFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFFFF" } };
  const border = { top: { style: "thin" as const, color: { argb: "FFE0E0E0" } }, bottom: { style: "thin" as const, color: { argb: "FFE0E0E0" } }, left: { style: "thin" as const, color: { argb: "FFE0E0E0" } }, right: { style: "thin" as const, color: { argb: "FFE0E0E0" } } };

  const logoBuf = await getLogoBuffer();
  const logoId = logoBuf ? wb.addImage({ buffer: logoBuf, extension: "png" }) : undefined;

  const ws = wb.addWorksheet("Report Mensile");
  ws.columns = [{ width: 30 }, { width: 16 }, { width: 30 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 12 }];

  ws.getRow(1).height = 26; ws.getRow(2).height = 18; ws.getRow(3).height = 15; ws.getRow(4).height = 8;
  if (logoId !== undefined) ws.addImage(logoId, { tl: { col: 0, row: 0 } as any, br: { col: 0.92, row: 3.8 } as any, editAs: "oneCell" });
  const r1 = ws.getRow(1); r1.getCell(2).value = "U.S. CREMONESE – REHAB AREA"; r1.getCell(2).font = { bold: true, size: 13, color: { argb: XL_RED } };
  const r2 = ws.getRow(2); r2.getCell(2).value = "REPORT MENSILE"; r2.getCell(2).font = { bold: true, size: 10, color: { argb: XL_RED } };
  const r3 = ws.getRow(3); r3.getCell(2).value = subtitle; r3.getCell(2).font = { size: 9, italic: true, color: { argb: "FF999999" } };
  ws.getRow(3).getCell(4).value = `Generato il ${oggi}`; ws.getRow(3).getCell(4).font = { size: 9, color: { argb: "FF999999" } }; ws.getRow(3).getCell(4).alignment = { horizontal: "right" };

  ws.addRow([]);
  const hRow = ws.addRow(["Nome", "Categoria", "Diagnosi / Infortunio", "Stato", "Inizio Rehab", "Fine Rehab", "Progresso"]);
  hRow.height = 20;
  hRow.eachCell((cell: any) => { cell.fill = darkFill; cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } }; cell.border = border; cell.alignment = { vertical: "middle" }; });

  atletiMese.forEach((a, i) => {
    const row = ws.addRow([
      a.nome, a.categoria, a.infortunio || "—", a.stato,
      a.inizioRehab ? new Date(a.inizioRehab + "T12:00").toLocaleDateString("it-IT") : "—",
      a.fineRehab   ? new Date(a.fineRehab   + "T12:00").toLocaleDateString("it-IT") : "—",
      `${a.progresso}%`,
    ]);
    row.height = 18;
    row.eachCell({ includeEmpty: true }, (cell: any) => { cell.fill = i % 2 !== 0 ? lightFill : whiteFill; cell.border = border; cell.font = { size: 9 }; cell.alignment = { vertical: "middle" }; });
  });

  ws.addRow([]);
  const rRiep = ws.addRow(["Riepilogo per categoria", "", `Totale: ${atletiMese.length} atleti`]);
  rRiep.getCell(1).font = { bold: true, size: 9, color: { argb: XL_RED } };
  rRiep.getCell(3).font = { bold: true, size: 9, color: { argb: XL_DARK } };
  CATEGORIE.forEach((cat, i) => {
    const n = atletiMese.filter((a) => a.categoria === cat).length;
    if (!n) return;
    const row = ws.addRow([cat, `${n} atleti`]);
    row.height = 16;
    row.eachCell({ includeEmpty: true }, (cell: any) => { cell.fill = i % 2 !== 0 ? lightFill : whiteFill; cell.border = border; cell.font = { size: 9 }; });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `USC_Report_${nomeMese}_${anno}.xlsx`; a.click();
  URL.revokeObjectURL(url);
}

async function esportaPDFReportMensile(atletiMese: Atleta[], mese: number, anno: number, filtroCat: string) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  const red: [number, number, number] = [200, 16, 46];
  const dark: [number, number, number] = [43, 43, 43];
  const gray: [number, number, number] = [130, 130, 130];
  const oggi = new Date().toLocaleDateString("it-IT");
  const nomeMese = MESI[mese];
  const logoDataUrl = await getLogoDataUrl();
  const M = 14; const W = 210; const H = 297; const HDR = 30;

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

  doc.setTextColor(...dark); doc.setFontSize(17); doc.setFont("helvetica", "bold");
  doc.text(`${nomeMese} ${anno}`, M, HDR + 13);
  if (filtroCat !== "Tutte") {
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
    doc.text(filtroCat, M, HDR + 21);
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
      styles: { fontSize: 8.5, cellPadding: 2.5, overflow: "ellipsize" },
      columnStyles: { 0: { cellWidth: 45, fontStyle: "bold", textColor: dark }, 1: { cellWidth: 25, halign: "center", textColor: dark } },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: M, right: W / 2 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  y = secTitle("Atleti del periodo", y);
  autoTable(doc, {
    startY: y,
    head: [["Nome", "Categoria", "Diagnosi / Infortunio", "Stato", "Inizio", "Fine", "%"]],
    body: atletiMese.map((a) => [
      a.nome, a.categoria, a.infortunio || "—", a.stato,
      a.inizioRehab ? new Date(a.inizioRehab + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—",
      a.fineRehab   ? new Date(a.fineRehab   + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—",
      `${a.progresso}%`,
    ]),
    headStyles: { fillColor: dark, textColor: 255, fontSize: 7.5 },
    bodyStyles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: M, right: M },
    columnStyles: { 0: { cellWidth: 36 }, 1: { cellWidth: 22 }, 2: { cellWidth: 50 }, 3: { cellWidth: 28 }, 4: { cellWidth: 18, halign: "center" }, 5: { cellWidth: 18, halign: "center" }, 6: { cellWidth: 10, halign: "center" } },
  });

  addFooter();
  doc.save(`USC_Report_${nomeMese}_${anno}.pdf`);
}

type PageTab = "progressi" | "report";

const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

function atletaAttivoInMese(a: Atleta, anno: number, mese: number): boolean {
  if (!a.inizioRehab) return false;
  const inizio = new Date(a.inizioRehab + "T12:00");
  const meseStart = new Date(anno, mese, 1);
  const meseEnd = new Date(anno, mese + 1, 0);
  if (inizio > meseEnd) return false;
  if (a.stato === "Guarito") {
    if (a.fineRehab) {
      const fine = new Date(a.fineRehab + "T12:00");
      return fine >= meseStart;
    }
    return inizio >= meseStart;
  }
  return true;
}

export default function ProgressiPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [programmi, setProgrammi] = useState<Programma[]>([]);
  const [esportando, setEsportando] = useState<string | null>(null);
  const [esportandoReport, setEsportandoReport] = useState<"excel" | "pdf" | null>(null);
  const [pageTab, setPageTab] = useState<PageTab>("progressi");

  const oggi = new Date();
  const [reportAnno, setReportAnno] = useState(oggi.getFullYear());
  const [reportMese, setReportMese] = useState(oggi.getMonth());
  const [filtroCat, setFiltroCat] = useState("Tutte");
  const [filtroInf, setFiltroInf] = useState("");

  useEffect(() => {
    loadAtleti().then(setAtleti);
    loadProgrammi().then(setProgrammi);
  }, []);

  const aggiorna = (id: string, campo: keyof Atleta, valore: string | number) => {
    let updatedAtleta: Atleta | undefined;
    const nuovi = atleti.map((a) => {
      if (a.id !== id) return a;
      const updated = { ...a, [campo]: valore };
      if (campo === "stato" && valore === "Guarito" && !a.fineRehab) {
        updated.fineRehab = new Date().toISOString().slice(0, 10);
      }
      updatedAtleta = updated;
      return updated;
    });
    setAtleti(nuovi);
    if (updatedAtleta) upsertAtleta(updatedAtleta);
  };

  const handleExport = async (atleta: Atleta, tipo: "excel" | "pdf") => {
    setEsportando(atleta.id + tipo);
    const prog = programmi.filter((p) => p.atletaId === atleta.id);
    try {
      if (tipo === "excel") await esportaExcel(atleta, prog);
      else await esportaPDF(atleta, prog);
    } finally {
      setEsportando(null);
    }
  };

  // Report mensile
  const atletiMese = atleti.filter((a) => {
    if (!atletaAttivoInMese(a, reportAnno, reportMese)) return false;
    if (filtroCat !== "Tutte" && a.categoria !== filtroCat) return false;
    if (filtroInf && !(a.infortunio ?? "").toLowerCase().includes(filtroInf.toLowerCase())) return false;
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
              {t === "progressi" ? "Progressi" : "Report mensile"}
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
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {atleta.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{atleta.nome}</h3>
                        <p className="text-sm text-gray-500">
                          {atleta.categoria}{atleta.posizione ? ` · ${atleta.posizione}` : ""}
                          {nProg > 0 ? ` · ${nProg} programm${nProg === 1 ? "a" : "i"}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleExport(atleta, "excel")} disabled={!!esportando}
                        className="flex items-center gap-1.5 border border-green-300 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-50 disabled:opacity-50">
                        <Download className="w-3.5 h-3.5" />
                        {esportando === atleta.id + "excel" ? "..." : "Excel"}
                      </button>
                      <button onClick={() => handleExport(atleta, "pdf")} disabled={!!esportando}
                        className="flex items-center gap-1.5 border border-red-200 text-[#C8102E] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50">
                        <FileText className="w-3.5 h-3.5" />
                        {esportando === atleta.id + "pdf" ? "..." : "PDF"}
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
                    {atleta.stato === "Guarito" && atleta.fineRehab && (
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mese</label>
                <select value={reportMese} onChange={(e) => setReportMese(Number(e.target.value))}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
                  {MESI.map((m, i) => <option key={m} value={i}>{m}</option>)}
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
                {MESI[reportMese]} {reportAnno}
                {filtroCat !== "Tutte" && ` · ${filtroCat}`}
                <span className="ml-2 text-sm font-bold text-[#C8102E]">{atletiMese.length} atleti</span>
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={async () => { setEsportandoReport("excel"); try { await esportaExcelReportMensile(atletiMese, reportMese, reportAnno, filtroCat); } finally { setEsportandoReport(null); } }}
                  disabled={!!esportandoReport || atletiMese.length === 0}
                  className="flex items-center gap-1.5 border border-green-300 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-50 disabled:opacity-50">
                  <Download className="w-3.5 h-3.5" />
                  {esportandoReport === "excel" ? "..." : "Excel"}
                </button>
                <button
                  onClick={async () => { setEsportandoReport("pdf"); try { await esportaPDFReportMensile(atletiMese, reportMese, reportAnno, filtroCat); } finally { setEsportandoReport(null); } }}
                  disabled={!!esportandoReport || atletiMese.length === 0}
                  className="flex items-center gap-1.5 border border-red-200 text-[#C8102E] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50">
                  <FileText className="w-3.5 h-3.5" />
                  {esportandoReport === "pdf" ? "..." : "PDF"}
                </button>
              </div>
            </div>

            {atletiMese.length === 0 ? (
              <div className="py-12 text-center">
                <Filter className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nessun atleta attivo in questo periodo</p>
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
                      {lista.map((a) => (
                        <div key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                          <div className="w-9 h-9 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {a.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{a.nome}</p>
                            <p className="text-xs text-gray-400 truncate">{a.infortunio || "—"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statoColor[a.stato]}`}>
                              {a.stato}
                            </span>
                            <p className="text-xs text-gray-400 mt-1">
                              {a.inizioRehab ? new Date(a.inizioRehab + "T12:00").toLocaleDateString("it-IT") : "—"}
                              {a.fineRehab ? ` → ${new Date(a.fineRehab + "T12:00").toLocaleDateString("it-IT")}` : ""}
                            </p>
                          </div>
                          <div className="w-16 text-right shrink-0">
                            <span className="text-lg font-bold text-[#C8102E]">{a.progresso}%</span>
                          </div>
                        </div>
                      ))}
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

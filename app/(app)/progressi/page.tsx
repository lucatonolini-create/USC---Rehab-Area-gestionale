"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Download, FileText, Calendar, Filter } from "lucide-react";
import {
  loadAtleti, loadProgrammi, upsertAtleta, uid, nd,
  CATEGORIE, type Atleta, type Stato, type Programma, type InfortunioStorico,
} from "@/lib/store";

const MESI_BREVI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const CAT_PALETTE = ["#C8102E","#1E40AF","#047857","#B45309","#7C3AED","#0E7490","#BE185D","#374151"];
const TIPO_PALETTE = ["#374151","#6B7280","#B45309","#1E40AF","#7C3AED","#0E7490","#047857","#BE185D"];
const hexToRgb = (h: string): [number, number, number] => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];

const STATI: Stato[] = ["Infortunato", "Disponibile"];
const statoColor: Record<Stato, string> = {
  "Infortunato": "bg-orange-100 text-orange-700",
  "Disponibile": "bg-green-100 text-green-700",
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
  addHeader(ws1, nd(atleta));
  ws1.addRow([]);
  addSectionTitle(ws1, "DATI PERSONALI", redFill);
  [
    ["Nome", nd(atleta)],
    ["Data di nascita", atleta.dataNascita ? new Date(atleta.dataNascita + "T12:00").toLocaleDateString("it-IT") : "—"],
    ["Categoria", atleta.categoria],
    ["Ruolo", atleta.posizione],
    ["Piede dominante", atleta.piedeDominante],
    ["Infortunio", atleta.infortunio || "—"],
    ["Inizio riabilitazione", atleta.inizioRehab ? new Date(atleta.inizioRehab + "T12:00").toLocaleDateString("it-IT") : "—"],
    ["Fine riabilitazione", atleta.fineRehab ? new Date(atleta.fineRehab + "T12:00").toLocaleDateString("it-IT") : "—"],
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

    addSectionTitle(ws, "PALESTRA", darkFill);
    const hRow = ws.addRow(["#", "Esercizio", "Serie", "Reps/Durata", "Carico", "RIR", "VAS", "Note"]);
    hRow.height = 20;
    hRow.eachCell((cell: any) => { cell.fill = redFill; cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } }; cell.border = border; cell.alignment = { vertical: "middle", horizontal: "center" }; });
    hRow.getCell(2).alignment = { vertical: "middle", horizontal: "left" };

    prog.esercizi.forEach((e, i) => {
      const row = ws.addRow([i + 1, e.nome, e.serie || "—", e.reps || "—", e.carico || "—", e.rir || "—", e.vas ? `${e.vas}/10` : "—", e.note || ""]);
      row.height = 18;
      row.eachCell({ includeEmpty: true }, (cell: any, col: number) => { cell.fill = i % 2 !== 0 ? lightFill : whiteFill; cell.border = border; cell.font = { size: 9 }; cell.alignment = { vertical: "middle", horizontal: col === 2 ? "left" : "center" }; });
    });

    if (prog.esercizicampo?.length) {
      ws.addRow([]);
      addSectionTitle(ws, "ESERCIZI IN CAMPO", darkFill);
      const hCampo = ws.addRow(["#", "Tipo", "Serie", "Durata", "Descrizione"]);
      hCampo.height = 20;
      const grayFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF646464" } };
      hCampo.eachCell((cell: any) => { cell.fill = grayFill; cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } }; cell.border = border; cell.alignment = { vertical: "middle", horizontal: "center" }; });
      hCampo.getCell(2).alignment = { vertical: "middle", horizontal: "left" };
      hCampo.getCell(5).alignment = { vertical: "middle", horizontal: "left" };
      prog.esercizicampo.forEach((c, i) => {
        const row = ws.addRow([i + 1, c.tipo || "—", c.serie || "—", c.durata || "—", c.descrizione || ""]);
        row.height = 18;
        row.eachCell({ includeEmpty: true }, (cell: any, col: number) => { cell.fill = i % 2 !== 0 ? lightFill : whiteFill; cell.border = border; cell.font = { size: 9 }; cell.alignment = { vertical: "middle", horizontal: col === 2 || col === 5 ? "left" : "center" }; });
      });
    }

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
      addSectionTitle(ws, "TEST FISIOTERAPICI E DI PERFORMANCE", darkFill);
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
  const a = document.createElement("a"); a.href = url; a.download = `${nd(atleta).replace(/ /g, "_")}_rehab.xlsx`; a.click();
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
    doc.setTextColor(...red); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("U.S. Cremonese", tx, 15);
    doc.setFontSize(9); doc.setFont("helvetica", "bolditalic"); doc.setTextColor(...gray);
    doc.text("Scheda Riabilitativa", tx, 19);
    if (subtitle) { doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray); doc.text(subtitle, tx, 24); }
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

  // ── Pagina 1: dati atleta ──────────────────────────────────────────────────
  addHeader();
  doc.setTextColor(...dark); doc.setFontSize(17); doc.setFont("helvetica", "bold");
  doc.text(nd(atleta), M, HDR + 13);
  const info = [atleta.categoria, atleta.posizione, atleta.piedeDominante ? `Piede ${atleta.piedeDominante}` : ""].filter(Boolean).join("  ·  ");
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
  doc.text(info, M, HDR + 21);
  // badge stato
  doc.setFillColor(...red); doc.roundedRect(W - M - 36, HDR + 7, 36, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  doc.text(atleta.stato, W - M - 18, HDR + 13.5, { align: "center" });
  doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.3); doc.line(M, HDR + 27, W - M, HDR + 27);

  const fmtDCl = (d: string) => new Date(d + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const ggCl = (inizio: string, fine?: string) => fine
    ? `${Math.round((new Date(fine + "T12:00").getTime() - new Date(inizio + "T12:00").getTime()) / 86400000)}gg`
    : "—";

  const tuttiInfortuni: Array<{ tipo?: string; diagnosi: string; inizio: string; fine?: string }> = [];
  if (atleta.infortunio || atleta.inizioRehab)
    tuttiInfortuni.push({ tipo: atleta.tipoInfortunio, diagnosi: atleta.infortunio || "—", inizio: atleta.inizioRehab, fine: atleta.fineRehab });
  (atleta.storicoInfortuni ?? []).forEach((s) =>
    tuttiInfortuni.push({ tipo: s.tipo, diagnosi: s.diagnosi, inizio: s.inizioRehab, fine: s.fineRehab })
  );

  let y = HDR + 34;
  y = secTitle("Dati clinici", y);
  autoTable(doc, {
    startY: y,
    body: [
      ["Data di nascita", atleta.dataNascita ? fmtDCl(atleta.dataNascita) : "—"],
      ["Piede dominante", atleta.piedeDominante || "—"],
      ["Stato attuale", atleta.stato],
    ],
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 3, overflow: "ellipsize", halign: "left", valign: "middle" },
    columnStyles: { 0: { cellWidth: 58, fontStyle: "bold", textColor: dark }, 1: { textColor: dark } },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  if (tuttiInfortuni.length > 0) {
    y = secTitle("Storico infortuni", y);
    autoTable(doc, {
      startY: y,
      head: [["#", "Tipo", "Diagnosi / Infortunio", "Inizio", "Fine", "Giorni"]],
      body: tuttiInfortuni.map((inf, i) => [
        i + 1,
        inf.tipo || "—",
        inf.diagnosi,
        inf.inizio ? fmtDCl(inf.inizio) : "—",
        inf.fine ? fmtDCl(inf.fine) : "—",
        inf.inizio ? ggCl(inf.inizio, inf.fine) : "—",
      ]),
      headStyles: { fillColor: dark, textColor: 255, fontSize: 7.5 },
      bodyStyles: { fontSize: 8.5, cellPadding: 3, halign: "left", valign: "middle" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: M, right: M },
      columnStyles: {
        0: { cellWidth: 8 }, 1: { cellWidth: 36 }, 2: { cellWidth: 72 },
        3: { cellWidth: 22 }, 4: { cellWidth: 22 }, 5: { cellWidth: 16 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (atleta.note) {
    y = secTitle("Note", y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...dark);
    doc.text(doc.splitTextToSize(atleta.note, W - M * 2), M, y);
  }

  // ── Sessioni: tabella settimanale compatta ──────────────────────────────────
  if (programmi.length > 0) {
    doc.addPage();
    addHeader(`${nd(atleta)}  ·  Sessioni di lavoro`);
    y = HDR + 8;
    y = secTitle(`Sessioni di lavoro — ${programmi.length} sessioni`, y);

    const sorted = [...programmi].sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));

    const getMonday = (dateStr: string): string => {
      const d = new Date(dateStr + "T12:00");
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d); mon.setDate(diff);
      return mon.toISOString().slice(0, 10);
    };

    const weekMap: Map<string, Programma[]> = new Map();
    for (const prog of sorted) {
      const wk = prog.data ? getMonday(prog.data) : "__nodata__";
      if (!weekMap.has(wk)) weekMap.set(wk, []);
      weekMap.get(wk)!.push(prog);
    }

    const body: any[] = [];
    const weekRowIndices = new Set<number>();
    const subHeaderRowIndices = new Set<number>();
    const altRowIndices = new Set<number>();
    const absenteRowIndices = new Set<number>();
    const riposoRowIndices = new Set<number>();

    Array.from(weekMap.entries()).forEach(([wk, wkProgs]) => {
      let weekLabel: string;
      if (wk === "__nodata__") {
        weekLabel = "SESSIONI SENZA DATA";
      } else {
        const mon = new Date(wk + "T12:00");
        const sun = new Date(mon.getTime() + 6 * 864e5);
        weekLabel = `SETTIMANA  ${mon.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })} – ${sun.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
      }
      weekRowIndices.add(body.length);
      body.push([{ content: weekLabel, colSpan: 7 }]);
      subHeaderRowIndices.add(body.length);
      body.push(["Data", "Programma / Fase", "Palestra", "VAS", "Campo", "Test", "RPE"]);

      let dataRowCount = 0;
      for (const prog of wkProgs) {
        const isAlt = dataRowCount % 2 === 1;
        const dataStr = prog.data ? fmtDCl(prog.data) : "—";
        const progLabel = [prog.nome, prog.fase].filter(Boolean).join("\n");
        const esercizi = prog.esercizi ?? [];

        const campoLines = (prog.esercizicampo ?? []).map((c) => {
          const parts = [c.tipo, c.serie ? `${c.serie}×` : "", c.durata || ""].filter(Boolean);
          return parts.join(" ");
        });
        const campo = campoLines.join("\n") || "—";

        const testLines = (prog.tests ?? []).map((t) => {
          const val = [t.risultato, t.risultatoSx ? `Sx ${t.risultatoSx}` : "", t.risultatoDx ? `Dx ${t.risultatoDx}` : ""].filter(Boolean).join(" / ");
          return `${t.nome}${val ? `: ${val}` : ""}`;
        });
        const tests = testLines.join("\n") || "—";

        if (prog.assente) {
          const label = [prog.nome, prog.noteAssenza].filter(Boolean).join("\n");
          absenteRowIndices.add(body.length);
          body.push([dataStr, label, { content: "ASSENTE", colSpan: 5, styles: { halign: "center" as const, fontStyle: "bold" as const } }]);
          dataRowCount++;
          continue;
        }

        if (prog.riposo) {
          const label = [prog.nome, prog.noteAssenza].filter(Boolean).join("\n");
          riposoRowIndices.add(body.length);
          body.push([dataStr, label, { content: "RIPOSO", colSpan: 5, styles: { halign: "center" as const, fontStyle: "bold" as const } }]);
          dataRowCount++;
          continue;
        }

        const ca = prog.carico;
        const rpe = ca?.rpe ? `${ca.rpe}/10` : "—";

        if (esercizi.length <= 1) {
          const esLine = esercizi.length === 1 ? (() => { const e = esercizi[0]; const sx = [e.serie, e.reps].filter(Boolean).join("×"); return sx ? `${e.nome} ${sx}` : e.nome; })() : "—";
          const vas = esercizi.length === 1 ? (esercizi[0].vas || "—") : "—";
          if (isAlt) altRowIndices.add(body.length);
          body.push([dataStr, progLabel, esLine, vas, campo, tests, rpe]);
        } else {
          esercizi.forEach((e, i) => {
            const esLine = (() => { const sx = [e.serie, e.reps].filter(Boolean).join("×"); return sx ? `${e.nome} ${sx}` : e.nome; })();
            const vas = e.vas || "—";
            if (isAlt) altRowIndices.add(body.length);
            if (i === 0) {
              body.push([
                { content: dataStr, rowSpan: esercizi.length, styles: { valign: "top" } },
                { content: progLabel, rowSpan: esercizi.length, styles: { valign: "top" } },
                esLine, vas,
                { content: campo, rowSpan: esercizi.length, styles: { valign: "top" } },
                { content: tests, rowSpan: esercizi.length, styles: { valign: "top" } },
                { content: rpe, rowSpan: esercizi.length, styles: { valign: "middle", halign: "center" } },
              ]);
            } else {
              body.push([esLine, vas]);
            }
          });
        }
        dataRowCount++;
      }
    });

    autoTable(doc, {
      startY: y,
      body,
      bodyStyles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" as const, halign: "left" as const, valign: "middle" as const },
      margin: { left: M, right: M },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: 50 },
        3: { cellWidth: 12, halign: "center" as const },
        4: { cellWidth: 28 },
        5: { cellWidth: 27 },
        6: { cellWidth: 15, halign: "center" as const },
      },
      didParseCell: (data: any) => {
        if (data.section !== "body") return;
        if (weekRowIndices.has(data.row.index)) {
          data.cell.styles.fillColor = [200, 16, 46];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 7;
          data.cell.styles.cellPadding = { top: 3, bottom: 3, left: 4, right: 2 };
        } else if (subHeaderRowIndices.has(data.row.index)) {
          data.cell.styles.fillColor = [110, 110, 110];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 6.5;
          data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 3, right: 2 };
        } else if (absenteRowIndices.has(data.row.index)) {
          data.cell.styles.fillColor = [255, 237, 213];
          data.cell.styles.textColor = [154, 52, 18];
        } else if (riposoRowIndices.has(data.row.index)) {
          data.cell.styles.fillColor = [219, 234, 254];
          data.cell.styles.textColor = [30, 64, 175];
        } else if (altRowIndices.has(data.row.index)) {
          data.cell.styles.fillColor = [243, 244, 246];
        } else {
          data.cell.styles.fillColor = [255, 255, 255];
        }
      },
    });
  }

  addFooter();
  doc.save(`${nd(atleta).replace(/ /g, "_")}_rehab.pdf`);
}

async function esportaExcelReportMensile(
  atletiMese: Atleta[], mese: number, anno: number, filtroCat: string,
  mesiP?: { anno: number; mese: number }[], periodoLbl?: string
) {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "U.S. Cremonese Rehab Area";
  const oggi = new Date().toLocaleDateString("it-IT");
  const nomeP = periodoLbl ?? `${MESI[mese]} ${anno}`;
  const subtitle = `${nomeP}${filtroCat !== "Tutte" ? ` – ${filtroCat}` : ""}`;

  const XL_RED  = "FFC8102E"; const XL_DARK = "FF2B2B2B"; const XL_LIGHT = "FFF5F5F5";
  const redFill  = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: XL_RED } };
  const darkFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: XL_DARK } };
  const lightFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: XL_LIGHT } };
  const whiteFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFFFF" } };
  const border = { top: { style: "thin" as const, color: { argb: "FFE0E0E0" } }, bottom: { style: "thin" as const, color: { argb: "FFE0E0E0" } }, left: { style: "thin" as const, color: { argb: "FFE0E0E0" } }, right: { style: "thin" as const, color: { argb: "FFE0E0E0" } } };

  const logoBuf = await getLogoBuffer();
  const logoId = logoBuf ? wb.addImage({ buffer: logoBuf, extension: "png" }) : undefined;

  const ws = wb.addWorksheet("Report");
  ws.columns = [{ width: 28 }, { width: 14 }, { width: 38 }, { width: 18 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 16 }, { width: 10 }];

  ws.getRow(1).height = 26; ws.getRow(2).height = 18; ws.getRow(3).height = 15; ws.getRow(4).height = 8;
  if (logoId !== undefined) ws.addImage(logoId, { tl: { col: 0, row: 0 } as any, br: { col: 0.92, row: 3.8 } as any, editAs: "oneCell" });
  const r1 = ws.getRow(1); r1.getCell(2).value = "U.S. CREMONESE – REHAB AREA"; r1.getCell(2).font = { bold: true, size: 13, color: { argb: XL_RED } };
  const r2 = ws.getRow(2); r2.getCell(2).value = "REPORT"; r2.getCell(2).font = { bold: true, size: 10, color: { argb: XL_RED } };
  const r3 = ws.getRow(3); r3.getCell(2).value = subtitle; r3.getCell(2).font = { size: 9, italic: true, color: { argb: "FF999999" } };
  ws.getRow(3).getCell(4).value = `Generato il ${oggi}`; ws.getRow(3).getCell(4).font = { size: 9, color: { argb: "FF999999" } }; ws.getRow(3).getCell(4).alignment = { horizontal: "right" };

  ws.addRow([]);
  const hRow = ws.addRow(["Nome", "Categoria", "Infortunio", "Tipo", "Inizio", "Fine", "Giorni", "Stato", "Progresso"]);
  hRow.height = 20;
  hRow.eachCell((cell: any) => { cell.fill = darkFill; cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } }; cell.border = border; cell.alignment = { vertical: "middle" }; });

  const fmtDXl = (d: string) => new Date(d + "T12:00").toLocaleDateString("it-IT");
  const ggXl = (inizio: string, fine?: string) => fine
    ? String(Math.round((new Date(fine + "T12:00").getTime() - new Date(inizio + "T12:00").getTime()) / 86400000))
    : "—";

  atletiMese.forEach((a, athleteIdx) => {
    const infortuni = infortunitNelPeriodo(a, mesiP ?? [{ anno, mese }]);
    const count = Math.max(infortuni.length, 1);
    const bg = athleteIdx % 2 !== 0 ? lightFill : whiteFill;
    const startRowNum = ws.rowCount + 1;

    const addXlRow = (values: any[]) => {
      const row = ws.addRow(values);
      row.height = 18;
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.fill = bg; cell.border = border; cell.font = { size: 9 };
        cell.alignment = { vertical: "middle" };
      });
    };
    if (infortuni.length === 0) {
      addXlRow([nd(a), a.categoria, "—", "—", "—", "—", "—", a.stato, `${a.progresso}%`]);
    } else {
      infortuni.forEach((inf) => {
        addXlRow([
          nd(a),
          a.categoria,
          inf.diagnosi,
          inf.tipo ?? "—",
          inf.inizio ? fmtDXl(inf.inizio) : "—",
          inf.fine ? fmtDXl(inf.fine) : "—",
          inf.inizio ? ggXl(inf.inizio, inf.fine) : "—",
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
  const a = document.createElement("a"); a.href = url; a.download = `USC_Report_${nomeP.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`; a.click();
  URL.revokeObjectURL(url);
}

async function esportaPDFReportMensile(
  atletiMese: Atleta[], mese: number, anno: number, filtroCat: string, filtroInf: string,
  atleti?: Atleta[], mesiP?: { anno: number; mese: number }[], periodoLbl?: string
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape" });
  const red: [number, number, number] = [200, 16, 46];
  const dark: [number, number, number] = [43, 43, 43];
  const gray: [number, number, number] = [130, 130, 130];
  const oggi = new Date().toLocaleDateString("it-IT");
  const nomeP = periodoLbl ?? `${MESI[mese]} ${anno}`;
  const logoDataUrl = await getLogoDataUrl();
  const M = 14; const W = 297; const H = 210; const HDR = 30;

  const addHeader = () => {
    doc.setFillColor(247, 247, 247); doc.rect(0, 0, W, HDR, "F");
    doc.setDrawColor(...red); doc.setLineWidth(0.4); doc.line(0, HDR, W, HDR);
    if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 4, 4, 22, 22);
    const tx = logoDataUrl ? 30 : M;
    doc.setTextColor(...red); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("U.S. Cremonese – Report", tx, 13);
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
    doc.text(oggi, W - M, 13, { align: "right" });
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

  doc.setTextColor(...dark); doc.setFontSize(17); doc.setFont("helvetica", "bold");
  doc.text(nomeP, M, HDR + 13);
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
      styles: { fontSize: 8.5, cellPadding: 2.5, overflow: "ellipsize", halign: "left", valign: "middle" },
      columnStyles: { 0: { cellWidth: 45, fontStyle: "bold", textColor: dark }, 1: { cellWidth: 25, textColor: dark } },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: M, right: W / 2 },
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
      return { label: MESI_BREVI[m2], total: attv.length, perCat, perTipo };
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

  y = secTitle("Atleti del periodo", y);

  const fmtDP = (d: string) => new Date(d + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const ggP = (inizio: string, fine?: string) => fine
    ? `${Math.round((new Date(fine + "T12:00").getTime() - new Date(inizio + "T12:00").getTime()) / 86400000)}gg`
    : "—";

  const pdfRows: any[][] = [];
  const athleteForRowP: number[] = [];
  atletiMese.forEach((a, athleteIdx) => {
    const tuttiInf = infortunitNelPeriodo(a, mesiP ?? [{ anno, mese }]);
    const infortuni = filtroInf
      ? tuttiInf.filter((inf) => {
          const q = filtroInf.toLowerCase();
          return inf.diagnosi.toLowerCase().includes(q) || (inf.tipo ?? "").toLowerCase().includes(q);
        })
      : tuttiInf;
    const count = Math.max(infortuni.length, 1);
    if (infortuni.length === 0) {
      pdfRows.push([nd(a), a.categoria, "—", "—", "—", "—", "—", a.stato, `${a.progresso}%`]);
      athleteForRowP.push(athleteIdx);
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
          inf.inizio ? fmtDP(inf.inizio) : "—",
          inf.fine ? fmtDP(inf.fine) : "—",
          inf.inizio ? ggP(inf.inizio, inf.fine) : "—",
          a.stato,
          `${a.progresso}%`,
        );
        pdfRows.push(row);
        athleteForRowP.push(athleteIdx);
      });
    }
  });

  autoTable(doc, {
    startY: y,
    head: [["Nome", "Categoria", "Infortunio", "Tipo", "Inizio", "Fine", "Giorni", "Stato", "%"]],
    body: pdfRows,
    headStyles: { fillColor: dark, textColor: 255, fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, cellPadding: 2, halign: "left", valign: "middle" },
    margin: { left: M, right: M },
    columnStyles: {
      0: { cellWidth: 34 }, 1: { cellWidth: 24 }, 2: { cellWidth: 72 },
      3: { cellWidth: 26 }, 4: { cellWidth: 20 }, 5: { cellWidth: 20 },
      6: { cellWidth: 16 }, 7: { cellWidth: 26 }, 8: { cellWidth: 13 },
    },
    didParseCell: (data: any) => {
      if (data.section === "body") {
        const ai = athleteForRowP[data.row.index];
        data.cell.styles.fillColor = ai % 2 !== 0 ? [248, 248, 248] : [255, 255, 255];
      }
    },
  });

  addFooter();
  doc.save(`USC_Report_${nomeP.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
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
  const [esportandoReport, setEsportandoReport] = useState<"excel" | "pdf" | null>(null);
  const [pageTab, setPageTab] = useState<PageTab>("progressi");

  const oggi = new Date();
  const [reportAnno, setReportAnno] = useState(oggi.getFullYear());
  const [reportMese, setReportMese] = useState(oggi.getMonth());
  const [filtroCat, setFiltroCat] = useState("Tutte");
  const [filtroInf, setFiltroInf] = useState("");
  const [tipoReport, setTipoReport] = useState<TipoReport>("mensile");
  const [reportMeseInizio, setReportMeseInizio] = useState(oggi.getMonth());

  useEffect(() => {
    loadAtleti().then(setAtleti);
    loadProgrammi().then(setProgrammi);
  }, []);

  const mesiPeriodo: { anno: number; mese: number }[] = (() => {
    if (tipoReport === "mensile") return [{ anno: reportAnno, mese: reportMese }];
    if (tipoReport === "annuale") return Array.from({ length: 12 }, (_, i) => ({ anno: reportAnno, mese: i }));
    if (tipoReport === "stagione") {
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(reportAnno - 1, 6 + i, 1);
        return { anno: d.getFullYear(), mese: d.getMonth() };
      });
    }
    const count = tipoReport === "trimestrale" ? 3 : 6;
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(reportAnno, reportMeseInizio + i, 1);
      return { anno: d.getFullYear(), mese: d.getMonth() };
    });
  })();

  const periodoLabel = (() => {
    if (tipoReport === "mensile") return `${MESI[reportMese]} ${reportAnno}`;
    if (tipoReport === "annuale") return `Anno ${reportAnno}`;
    if (tipoReport === "stagione") return `Stagione ${reportAnno - 1}–${reportAnno}`;
    const first = mesiPeriodo[0];
    const last = mesiPeriodo[mesiPeriodo.length - 1];
    const tipoLbl = tipoReport === "trimestrale" ? "Trimestre" : "Semestre";
    const annoLbl = first.anno === last.anno ? `${first.anno}` : `${first.anno}–${last.anno}`;
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
              {(tipoReport === "trimestrale" || tipoReport === "semestrale") && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mese inizio</label>
                  <select value={reportMeseInizio} onChange={(e) => setReportMeseInizio(Number(e.target.value))}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
                    {MESI.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {tipoReport === "stagione" ? "Stagione (anno fine)" : "Anno"}
                </label>
                <select value={reportAnno} onChange={(e) => setReportAnno(Number(e.target.value))}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
                  {anni.map((a) => <option key={a} value={a}>{tipoReport === "stagione" ? `${a - 1}–${a}` : a}</option>)}
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
                  onClick={async () => { setEsportandoReport("excel"); try { await esportaExcelReportMensile(atletiMese, reportMese, reportAnno, filtroCat, mesiPeriodo, periodoLabel); } finally { setEsportandoReport(null); } }}
                  disabled={!!esportandoReport || atletiMese.length === 0}
                  className="flex items-center gap-1.5 border border-green-300 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-50 disabled:opacity-50">
                  <Download className="w-3.5 h-3.5" />
                  {esportandoReport === "excel" ? "..." : "Excel"}
                </button>
                <button
                  onClick={async () => { setEsportandoReport("pdf"); try { await esportaPDFReportMensile(atletiMese, reportMese, reportAnno, filtroCat, filtroInf, atleti, mesiPeriodo, periodoLabel); } finally { setEsportandoReport(null); } }}
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

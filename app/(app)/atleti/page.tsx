"use client";

import { useEffect, useState } from "react";
import { Plus, Search, User, ChevronRight, Phone, Mail, Trash2, AlertTriangle, CheckCircle2, Clock, Pencil, RotateCcw, FileDown, X, ExternalLink, Copy, Check } from "lucide-react";
import {
  loadAtleti, loadProgrammi, upsertAtleta, deleteAtleta, uid, nd,
  subscribeToAtleti, subscribeToProgrammi, subscribeToIntakeInsert,
  CATEGORIE, TIPI_INFORTUNIO, calcolaProgressoAuto,
  TIPI_REFERTO, ESITI_REFERTO,
  type Atleta, type Stato, type InfortunioStorico, type Programma, type QuestionarioKinesiofobia,
  type RefertoClinico, type TipoReferto, type EsitoReferto, type TestFisiometrico,
} from "@/lib/store";
import AtletaModal from "@/components/AtletaModal";
import CartellaClinaca from "@/components/CartellaClinaca";

const MAPPING_KEY = "perf_athlete_mapping";
function getPerfId(rehabId: string): string | null {
  try { return JSON.parse(localStorage.getItem(MAPPING_KEY) ?? "{}")[rehabId] ?? null; } catch { return null; }
}

async function syncInjury(atleta: Atleta) {
  const perfId = getPerfId(atleta.id);
  const statoMap: Record<string, string> = { Infortunato: "rehab", Disponibile: "disponibile" };
  const body: Record<string, any> = {
    external_id: atleta.id,
    athlete_name: atleta.nome,
    date: atleta.inizioRehab || new Date().toISOString().slice(0, 10),
    type: (atleta.tipoInfortunio ?? "").toLowerCase() || "altro",
    body_part: atleta.infortunio || "",
    status: statoMap[atleta.stato] ?? "rehab",
    notes: atleta.note || "",
  };
  if (perfId) body.athlete_id = perfId;
  if (atleta.fineRehab) body.expected_return = atleta.fineRehab;
  try {
    await fetch("/api/performance/injuries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch { /* sync is best-effort */ }
}

async function getLogoDataUrl(): Promise<string | null> {
  try {
    const resp = await fetch("/logo.png");
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((res) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function _calcolaAsimmetria(sx: string, dx: string): number | null {
  const a = parseFloat(sx), b = parseFloat(dx);
  if (isNaN(a) || isNaN(b) || a <= 0 || b <= 0) return null;
  return Math.abs(a - b) / Math.max(a, b) * 100;
}
function _superioreTest(sx: string, dx: string): "Dx" | "Sx" | null {
  const a = parseFloat(sx), b = parseFloat(dx);
  if (isNaN(a) || isNaN(b) || a === b) return null;
  return b > a ? "Dx" : "Sx";
}
function _trovaPrecedenteTest(lista: Programma[], currentId: string, nomeTest: string): TestFisiometrico | null {
  const sorted = [...lista].filter(p => !p.assente && !p.riposo && p.tests?.length).sort((a, b) => a.data.localeCompare(b.data));
  const idx = sorted.findIndex(p => p.id === currentId);
  if (idx <= 0) return null;
  for (let k = idx - 1; k >= 0; k--) {
    const found = (sorted[k].tests ?? []).find(tt => tt.nome === nomeTest);
    if (found) return found;
  }
  return null;
}
function _calcolaDelta(curr: TestFisiometrico, prev: TestFisiometrico | null): number | null {
  if (!prev) return null;
  const avg = (vals: (string | undefined)[]) => { const ns = vals.map(v => parseFloat(v ?? "")).filter(v => !isNaN(v) && v > 0); return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : NaN; };
  if (curr.rsiSx || curr.rsiDx) { const c = avg([curr.rsiSx, curr.rsiDx]), p = avg([prev.rsiSx, prev.rsiDx]); if (isNaN(c) || isNaN(p) || p <= 0) return null; return ((c - p) / p) * 100; }
  if (curr.rsi && prev.rsi) { const c = parseFloat(curr.rsi), p = parseFloat(prev.rsi); if (isNaN(c) || isNaN(p) || p <= 0) return null; return ((c - p) / p) * 100; }
  if (curr.risultatoSx || curr.risultatoDx) { const c = avg([curr.risultatoSx, curr.risultatoDx]), p = avg([prev.risultatoSx, prev.risultatoDx]); if (isNaN(c) || isNaN(p) || p <= 0) return null; return ((c - p) / p) * 100; }
  if (curr.risultato && prev.risultato) { const c = parseFloat(curr.risultato), p = parseFloat(prev.risultato); if (isNaN(c) || isNaN(p) || p <= 0) return null; return ((c - p) / p) * 100; }
  return null;
}

async function esportaStoricoCompletoPDF(atleta: Atleta, programmi: Programma[]) {
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
    doc.setFillColor(247, 247, 247); doc.rect(0, 0, W, HDR, "F");
    doc.setDrawColor(...red); doc.setLineWidth(0.4); doc.line(0, HDR, W, HDR);
    if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 4, 4, 22, 22);
    const tx = logoDataUrl ? 30 : M;
    doc.setTextColor(...red); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("U.S. Cremonese", tx, 15);
    doc.setFontSize(9); doc.setFont("helvetica", "bolditalic"); doc.setTextColor(...gray);
    doc.text("Scheda Completa Atleta", tx, 19);
    if (subtitle) { doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray); doc.text(subtitle, tx, 24); }
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
    doc.text(oggi, W - M, 15, { align: "right" });
  };

  const secTitle = (text: string, y: number, fill?: [number, number, number]) => {
    const bg = fill ?? [245, 245, 245] as [number, number, number];
    const tc: [number, number, number] = fill ? [255, 255, 255] : dark;
    doc.setFillColor(...bg); doc.rect(M, y - 4, W - M * 2, 8, "F");
    if (!fill) { doc.setFillColor(...red); doc.rect(M, y - 4, 2.5, 8, "F"); }
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...tc);
    doc.text(text.toUpperCase(), M + 5, y + 0.8);
    return y + 11;
  };

  const addFooter = () => {
    const tot = doc.getNumberOfPages();
    for (let i = 1; i <= tot; i++) {
      doc.setPage(i);
      doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.3); doc.line(M, H - 12, W - M, H - 12);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text("U.S. Cremonese · Rehab Area", M, H - 7);
      doc.text(`Pagina ${i} di ${tot}`, W - M, H - 7, { align: "right" });
    }
  };

  const fmtD = (d: string) => d ? new Date(d + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";
  const ggPersi = (i: string, f: string) => { const ms = new Date(f).getTime() - new Date(i).getTime(); return Math.max(0, Math.round(ms / 864e5)); };

  let y = 0;
  const bS = { fontSize: 8.5, cellPadding: 3, overflow: "ellipsize" as const, halign: "left" as const, valign: "middle" as const };
  const aS = { fillColor: [250, 250, 250] as [number, number, number] };
  const hS = (fill: [number, number, number]) => ({ fillColor: fill, textColor: [255, 255, 255] as [number, number, number], fontSize: 7.5, halign: "center" as const, valign: "middle" as const });
  const checkPage = (need: number, sub?: string) => { if (y + need > H - 18) { doc.addPage(); addHeader(sub); y = HDR + 8; } };
  const miniLabel = (text: string) => { doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...gray); doc.text(text, M, y); y += 3; };

  const drawChart = (items: { data: string; punteggio: number }[], sub?: string) => {
    if (items.length < 2) return;
    checkPage(68, sub);
    const sorted = [...items].sort((a, b) => a.data.localeCompare(b.data));
    const n = sorted.length;
    const yAxisW = 10; const cX = M + yAxisW; const cW = W - M - cX; const cH = 44; const cY = y + 7;
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...dark);
    doc.text("Andamento RTS Score nel tempo", M, y + 2);
    doc.setFillColor(248, 248, 248); doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3); doc.rect(cX, cY, cW, cH, "FD");
    ([
      [100, [210, 210, 210] as [number, number, number], false], [75, [34, 139, 34] as [number, number, number], true],
      [56, [210, 100, 0] as [number, number, number], true], [0, [210, 210, 210] as [number, number, number], false],
    ] as [number, [number, number, number], boolean][]).forEach(([val, col, dash]) => {
      const ly = cY + cH - (val / 100) * cH;
      doc.setDrawColor(...col); doc.setLineWidth(dash ? 0.45 : 0.2);
      if (dash) { let dx = cX; while (dx < cX + cW) { doc.line(dx, ly, Math.min(dx + 2.5, cX + cW), ly); dx += 4; } }
      else { doc.line(cX, ly, cX + cW, ly); }
      doc.setFontSize(5.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...col);
      doc.text(`${val}`, cX - 1.5, ly + 1.5, { align: "right" });
    });
    const padX = 10;
    const gX = (ii: number) => cX + padX + (n > 1 ? (ii / (n - 1)) * (cW - 2 * padX) : (cW - 2 * padX) / 2);
    const gY = (s: number) => cY + cH - (s / 100) * cH;
    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.7);
    for (let ii = 0; ii < n - 1; ii++) doc.line(gX(ii), gY(sorted[ii].punteggio), gX(ii + 1), gY(sorted[ii + 1].punteggio));
    sorted.forEach((q, ii) => {
      const px = gX(ii); const py = gY(q.punteggio);
      const col: [number, number, number] = q.punteggio >= 75 ? [34, 139, 34] : q.punteggio >= 56 ? [234, 88, 12] : red;
      doc.setFillColor(...col); doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5); doc.circle(px, py, 2, "FD");
      doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(...col);
      doc.text(`${q.punteggio}`, px, q.punteggio > 90 ? py + 5 : py - 3.5, { align: "center" });
      doc.setFontSize(5.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
      doc.text(fmtD(q.data), px, cY + cH + 4.5, { align: "center" });
    });
    const legY = cY + cH + 10;
    ([{ col: [210, 100, 0] as [number, number, number], label: "Soglia moderata (56)" }, { col: [34, 139, 34] as [number, number, number], label: "Alta prontezza (75)" }])
      .forEach(({ col, label }, idx) => {
        const lx = M + idx * 72; doc.setDrawColor(...col); doc.setLineWidth(0.5);
        let dx = lx; while (dx < lx + 9) { doc.line(dx, legY, Math.min(dx + 2.5, lx + 9), legY); dx += 4; }
        doc.setFontSize(6); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray); doc.text(label, lx + 11, legY + 1);
      });
    y = legY + 10;
  };

  const getMonday = (dateStr: string): string => {
    const d = new Date(dateStr + "T12:00");
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d); mon.setDate(diff);
    return mon.toISOString().slice(0, 10);
  };

  const renderWeeklyTable = (progs: Programma[], sub?: string) => {
    const weekMap: Map<string, Programma[]> = new Map();
    for (const prog of progs) {
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
      body.push([{ content: weekLabel, colSpan: 12 }]);
      subHeaderRowIndices.add(body.length);
      body.push(["Data", "Programma", "Fase", "Obiettivi Palestra", "Esercizi Palestra", "VAS", "Obiettivi Campo", "Esercizi Campo", "VAS Campo", "GPS", "Test", "RPE"]);

      let dataRowCount = 0;
      for (const prog of wkProgs) {
        const isAlt = dataRowCount % 2 === 1;
        const dataStr = prog.data ? fmtD(prog.data) : "—";
        const esercizi = prog.esercizi ?? [];

        if (prog.assente) {
          absenteRowIndices.add(body.length);
          body.push([dataStr, prog.nome ?? "—", { content: "ASSENTE" + (prog.noteAssenza ? `\n${prog.noteAssenza}` : ""), colSpan: 10, styles: { halign: "center" as const, fontStyle: "bold" as const } }]);
          dataRowCount++;
          continue;
        }

        if (prog.riposo) {
          riposoRowIndices.add(body.length);
          body.push([dataStr, prog.nome ?? "—", { content: "RIPOSO" + (prog.noteAssenza ? `\n${prog.noteAssenza}` : ""), colSpan: 10, styles: { halign: "center" as const, fontStyle: "bold" as const } }]);
          dataRowCount++;
          continue;
        }

        const obP = prog.obiettiviPalestra?.length ? prog.obiettiviPalestra.join(", ") : "—";
        const obCampo = prog.obiettiviCampo?.length ? prog.obiettiviCampo.join(", ") : "—";

        const campoEsLines = (prog.esercizicampo ?? []).map((c) => {
          const parts = [c.tipo, c.serie ? `${c.serie}×` : "", c.durata || ""].filter(Boolean);
          return parts.join(" ");
        });
        const esC = campoEsLines.join("\n") || "—";
        const vasC = (prog.esercizicampo ?? []).map((c) => c.vas || "—").join("\n") || "—";

        const testLines = (prog.tests ?? []).map((t) => {
          const isSL = t.nome === "SL Drop Jump";
          const val = [t.risultato, t.risultatoSx ? `Sx ${t.risultatoSx}` : "", t.risultatoDx ? `Dx ${t.risultatoDx}` : ""].filter(Boolean).join(" / ");
          const extras: string[] = [];
          const sxV = isSL ? (t.rsiSx ?? "") : (t.risultatoSx ?? "");
          const dxV = isSL ? (t.rsiDx ?? "") : (t.risultatoDx ?? "");
          const asim = _calcolaAsimmetria(sxV, dxV);
          const sup = _superioreTest(sxV, dxV);
          if (asim !== null && sup !== null) extras.push(`${sup} +${asim.toFixed(1)}%`);
          const prev = _trovaPrecedenteTest(programmi, prog.id, t.nome);
          const delta = _calcolaDelta(t, prev);
          if (delta !== null) extras.push(`${delta >= 0 ? "↑" : "↓"} ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`);
          return `${t.nome}${val ? `: ${val}` : ""}${extras.length ? ` [${extras.join(", ")}]` : ""}`;
        });
        const tests = testLines.join("\n") || "—";
        const ca = prog.carico;
        const rpe = ca?.rpe ? `${ca.rpe}/10` : "—";
        const gps = [
          ca?.distanzaTotale ? `Dist.: ${ca.distanzaTotale}m` : "",
          ca?.velocitaMax ? `V.max: ${ca.velocitaMax}km/h` : "",
          ca?.hsr ? `D>16km/h: ${ca.hsr}m` : "",
          ca?.velocita21 ? `D>20km/h: ${ca.velocita21}m` : "",
          ca?.velocita25 ? `D>25km/h: ${ca.velocita25}m` : "",
          ca?.accelerazioni ? `N.Acc: ${ca.accelerazioni}` : "",
          ca?.decelerazioni ? `N.Dec: ${ca.decelerazioni}` : "",
          ca?.sprint ? `N.Spr: ${ca.sprint}` : "",
          ca?.potenzaMetabolica ? `P.Met.: ${ca.potenzaMetabolica}W/kg` : "",
        ].filter(Boolean).join("\n") || "—";

        const esText = esercizi.map((e) => { const sx = [e.serie, e.reps].filter(Boolean).join("×"); return sx ? `${e.nome} ${sx}` : e.nome; }).join("\n") || "—";
        const vasText = esercizi.map((e) => e.vas || "—").join("\n") || "—";
        if (isAlt) altRowIndices.add(body.length);
        body.push([dataStr, prog.nome ?? "—", prog.fase ?? "—", obP, esText, vasText, obCampo, esC, vasC, gps, tests, rpe]);
        dataRowCount++;
      }
    });

    checkPage(30, sub);
    autoTable(doc, {
      startY: y,
      body,
      bodyStyles: { fontSize: 6, cellPadding: 1.5, overflow: "linebreak" as const, halign: "left" as const, valign: "middle" as const },
      margin: { left: M, right: M },
      columnStyles: {
        0:  { cellWidth: 12 },
        1:  { cellWidth: 16 },
        2:  { cellWidth: 10 },
        3:  { cellWidth: 13 },
        4:  { cellWidth: 24 },
        5:  { cellWidth: 9, halign: "center" as const },
        6:  { cellWidth: 13 },
        7:  { cellWidth: 26 },
        8:  { cellWidth: 13, halign: "center" as const },
        9:  { cellWidth: 26 },
        10: { cellWidth: 12 },
        11: { cellWidth: 8, halign: "center" as const },
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
          data.cell.styles.fontSize = 5.8;
          data.cell.styles.halign = "center";
          data.cell.styles.valign = "middle";
          data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 1.5, right: 1 };
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
    y = (doc as any).lastAutoTable.finalY + 6;
  };

  // ── Pagina 1: dati atleta ──────────────────────────────────────────────────
  addHeader();
  doc.setTextColor(...dark); doc.setFontSize(17); doc.setFont("helvetica", "bold");
  doc.text(nd(atleta), M, HDR + 13);
  const info = [atleta.categoria, atleta.posizione, atleta.piedeDominante ? `Piede ${atleta.piedeDominante}` : ""].filter(Boolean).join("  ·  ");
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
  doc.text(info, M, HDR + 21);
  const badgeColor: [number, number, number] = atleta.stato === "Disponibile" ? [34, 139, 34] : red;
  doc.setFillColor(...badgeColor); doc.roundedRect(W - M - 36, HDR + 7, 36, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  doc.text(atleta.stato, W - M - 18, HDR + 13.5, { align: "center" });
  doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.3); doc.line(M, HDR + 27, W - M, HDR + 27);

  y = HDR + 34;
  y = secTitle("Dati clinici", y);
  autoTable(doc, {
    startY: y,
    body: [
      ["Categoria / Ruolo", `${atleta.categoria}  ·  ${atleta.posizione || "—"}`],
      ["Piede dominante", atleta.piedeDominante || "—"],
      ["Stato attuale", atleta.stato],
      ...(atleta.peso || atleta.altezza ? [["Peso / Altezza", `${atleta.peso || "—"} kg  ·  ${atleta.altezza || "—"} cm`]] : [] as any),
      ...(atleta.tipoInfortunio ? [["Tipologia", atleta.tipoInfortunio]] : [] as any),
      ...(atleta.evento ? [["Evento", atleta.evento]] : [] as any),
      ...(atleta.meccanismo ? [["Meccanismo", atleta.meccanismo]] : [] as any),
      ...(atleta.contatto ? [["Contatto", atleta.contatto]] : [] as any),
      ...(atleta.lato ? [["Lato", atleta.lato]] : [] as any),
      ...(atleta.posizioneInfortunio ? [["Posizione", atleta.posizioneInfortunio]] : [] as any),
      ...(atleta.note ? [["Note", atleta.note]] : [] as any),
    ],
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 3, overflow: "linebreak", halign: "left", valign: "middle" },
    columnStyles: { 0: { cellWidth: 58, fontStyle: "bold", textColor: dark }, 1: { textColor: dark } },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: M, right: M },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Referti clinici ───────────────────────────────────────────────────────
  const referti = [...(atleta.refertiClinici ?? [])].sort((a, b) => b.data.localeCompare(a.data));
  checkPage(20);
  y = secTitle("Referti clinici", y);
  if (referti.length === 0) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text("Nessun referto registrato.", M, y); y += 10;
  } else {
    const esitoColor = (esito: string): [number, number, number] => {
      if (esito === "Negativo") return [34, 139, 34];
      if (esito === "In miglioramento") return [180, 120, 0];
      return [180, 30, 30]; // Positivo
    };
    autoTable(doc, {
      startY: y,
      head: [["Data", "Tipo esame", "Esito", "Note"]],
      body: referti.map((r) => [
        new Date(r.data + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }),
        r.tipo,
        r.esito,
        r.note || "—",
      ]),
      headStyles: hS(dark),
      bodyStyles: { ...bS, fontSize: 8 },
      alternateRowStyles: aS,
      margin: { left: M, right: M },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 40 },
        2: { cellWidth: 36 },
        3: { cellWidth: "auto" as any },
      },
      didDrawCell: (data: any) => {
        if (data.section === "body" && data.column.index === 2) {
          const esito = referti[data.row.index]?.esito ?? "";
          data.cell.styles.textColor = esitoColor(esito);
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Storico infortuni ──────────────────────────────────────────────────────
  const storico = atleta.storicoInfortuni ?? [];
  // Giorni persi = numero di sessioni inserite per quell'infortunio (non giorni di calendario)
  const isSessionePDF = (p: Programma) => !p.riposo;
  const sessStoricoMap = new Map(storico.map((inf) => [inf.id, programmi.filter((p) => p.infortunioId === inf.id && isSessionePDF(p)).length]));
  const giorniArchivio = storico.map((inf) => sessStoricoMap.get(inf.id) ?? 0);
  const giorniCorrente = atleta.stato === "Infortunato" && atleta.inizioRehab
    ? programmi.filter((p) => (
        p.infortunioId === "__corrente__" ||
        (!p.infortunioId && p.data >= atleta.inizioRehab)
      ) && isSessionePDF(p)).length : 0;
  const totaleStagionePDF = giorniArchivio.reduce((s, g) => s + g, 0) + giorniCorrente;

  y = secTitle("Storico infortuni", y);

  // Riquadro riepilogativo sessioni
  {
    const boxes: [string, string][] = [];
    if (atleta.stato === "Infortunato") boxes.push(["Infortunio attuale", `${giorniCorrente} sess.`]);
    boxes.push(["Totale stagione", `${totaleStagionePDF} sess.`]);
    const bw = (W - 2 * M - (boxes.length - 1) * 4) / boxes.length;
    boxes.forEach(([label, val], i) => {
      const bx = M + i * (bw + 4);
      doc.setFillColor(255, 247, 237); doc.roundedRect(bx, y, bw, 16, 2, 2, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(234, 88, 12);
      doc.text(label.toUpperCase(), bx + bw / 2, y + 5.5, { align: "center" });
      doc.setFontSize(11);
      doc.text(val, bx + bw / 2, y + 13, { align: "center" });
    });
    y += 22;
  }

  const storicoBody: any[] = [];
  // Infortunio corrente se in corso
  if (atleta.stato === "Infortunato" && (atleta.infortunio || atleta.inizioRehab)) {
    storicoBody.push([`${atleta.infortunio || "—"}${atleta.tipoInfortunio ? ` (${atleta.tipoInfortunio})` : ""}`, fmtD(atleta.inizioRehab), "In corso", `${giorniCorrente} sess.`]);
  }
  // Infortuni archiviati (più recente prima)
  [...storico].reverse().forEach((inf, i) => {
    storicoBody.push([`${inf.diagnosi}${inf.tipo ? ` (${inf.tipo})` : ""}`, fmtD(inf.inizioRehab), fmtD(inf.fineRehab), `${giorniArchivio[storico.length - 1 - i]} sess.`]);
  });

  if (storicoBody.length) {
    autoTable(doc, {
      startY: y,
      head: [["Diagnosi / Infortunio", "Inizio", "Fine", "Sessioni"]],
      body: storicoBody,
      headStyles: { fillColor: red, textColor: 255, fontSize: 7.5, halign: "center", valign: "middle" },
      bodyStyles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak", halign: "left", valign: "middle" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: M, right: M },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 28 }, 2: { cellWidth: 28 }, 3: { cellWidth: 28 } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  } else {
    doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text("Nessun infortunio registrato.", M, y); y += 10;
  }

  // ── PER-INJURY SECTIONS ──────────────────────────────────────────────────
  const interpretaRTS = (p: number) =>
    p >= 75 ? "Alta prontezza psicologica — Pronto per il ritorno"
    : p >= 56 ? "Prontezza moderata — Valutare con attenzione"
    : "Bassa prontezza psicologica — Ritorno non raccomandato";

  const today = new Date().toISOString().slice(0, 10);

  const allInjuries: { id: string; diagnosi: string; tipo?: string; inizio: string; fine: string | null; attivo: boolean }[] = [
    ...(atleta.storicoInfortuni ?? []).map((inf) => ({
      id: inf.id,
      diagnosi: inf.diagnosi,
      tipo: inf.tipo,
      inizio: inf.inizioRehab,
      fine: inf.fineRehab,
      attivo: false,
    })),
    ...(atleta.stato === "Infortunato" && (atleta.infortunio || atleta.inizioRehab)
      ? [{ id: "__corrente__", diagnosi: atleta.infortunio || "—", tipo: atleta.tipoInfortunio as string | undefined, inizio: atleta.inizioRehab, fine: null as string | null, attivo: true }]
      : []),
  ];

  const usedProgIds = new Set<string>();

  for (const inj of allInjuries) {
    const injProgs = programmi
      .filter((p) => {
        if (p.infortunioId) return p.infortunioId === inj.id;
        if (!p.data || !inj.inizio) return false;
        if (p.data < inj.inizio) return false;
        if (inj.fine && p.data > inj.fine) return false;
        return true;
      })
      .sort((a, b) => a.data.localeCompare(b.data));
    injProgs.forEach((p) => usedProgIds.add(p.id));

    const injQRTS = (atleta.questionariKinesiofobia ?? []).filter((q) => q.infortunioId === inj.id);
    const giorni = inj.fine ? ggPersi(inj.inizio, inj.fine) : ggPersi(inj.inizio, today);
    const injLabel = `${inj.diagnosi}${inj.tipo ? ` (${inj.tipo})` : ""}`;
    const sub = `${nd(atleta)}  ·  ${injLabel}`;

    doc.addPage();
    addHeader(sub);
    y = HDR + 8;

    // Injury info bar (white bg, red text + underline, dates below)
    doc.setFillColor(255, 255, 255); doc.rect(M, y, W - 2 * M, 22, "F");
    doc.setFont("helvetica", "bolditalic"); doc.setFontSize(9.5); doc.setTextColor(...red);
    doc.text(injLabel, M, y + 9);
    const injLabelW = doc.getTextWidth(injLabel);
    doc.setDrawColor(...red); doc.setLineWidth(0.5);
    doc.line(M, y + 10.5, M + injLabelW, y + 10.5);
    const periodStr = inj.attivo
      ? `Dal ${fmtD(inj.inizio)} - In corso (${giorni} giorni)`
      : `${fmtD(inj.inizio)} - ${fmtD(inj.fine ?? "")}  (${giorni} giorni)`;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...gray);
    doc.text(periodStr, M, y + 17);
    y += 28;

    // RTS evaluations for this injury
    if (injQRTS.length > 0) {
      checkPage(20, sub);
      y = secTitle("Valutazione psicologica – TSK / AFAQ", y);
      autoTable(doc, {
        startY: y,
        head: [["Data", "Test", "Punteggio", "Interpretazione"]],
        body: [...injQRTS].sort((a, b) => a.data.localeCompare(b.data)).map((q) => [
          new Date(q.data + "T12:00").toLocaleDateString("it-IT"),
          q.tipoTest ?? "—",
          `${q.punteggio} / 100`,
          interpretaRTS(q.punteggio),
        ]),
        headStyles: hS(dark),
        bodyStyles: bS,
        alternateRowStyles: aS,
        margin: { left: M, right: M },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 20, fontStyle: "bold" }, 2: { cellWidth: 28, fontStyle: "bold" } },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
      if (injQRTS.length >= 2) drawChart(injQRTS, sub);
    }

    // Programs for this injury
    if (injProgs.length > 0) {
      checkPage(20, sub);
      y = secTitle(`Sessioni di lavoro — ${injProgs.filter(isSessionePDF).length} sessioni`, y);
      renderWeeklyTable(injProgs, sub);
    } else {
      checkPage(12, sub);
      doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...gray);
      doc.text("Nessuna sessione registrata per questo infortunio.", M, y); y += 10;
    }
  }

  // ── Sessioni non associate ────────────────────────────────────────────────
  const unassigned = programmi
    .filter((p) => !usedProgIds.has(p.id))
    .sort((a, b) => a.data.localeCompare(b.data));

  if (unassigned.length > 0) {
    doc.addPage();
    addHeader(`${nd(atleta)}  ·  Sessioni non associate`);
    y = HDR + 8;
    y = secTitle(`Sessioni non associate a nessun infortunio — ${unassigned.filter(isSessionePDF).length} sessioni`, y);
    renderWeeklyTable(unassigned, `${nd(atleta)}  ·  Sessioni non associate`);
  }

  addFooter();
  doc.save(`${nd(atleta).replace(/ /g, "_")}_storico_completo.pdf`);
}

const statoColor: Record<Stato, string> = {
  "Infortunato": "bg-orange-100 text-orange-700",
  "Disponibile": "bg-green-100 text-green-700",
};

const FILTRI_STATO: { label: string; value: Stato | "Tutti" }[] = [
  { label: "Tutti", value: "Tutti" },
  { label: "Infortunato", value: "Infortunato" },
  { label: "Disponibile", value: "Disponibile" },
];

type Tab = "dati" | "cartella" | "storia";

function giorniPersi(inizio: string, fine: string): number {
  if (!inizio || !fine) return 0;
  const ms = new Date(fine).getTime() - new Date(inizio).getTime();
  return Math.max(0, Math.round(ms / 864e5));
}

export default function AtletiPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [search, setSearch] = useState("");
  const [filtroStato, setFiltroStato] = useState<Stato | "Tutti">("Tutti");
  const [selected, setSelected] = useState<Atleta | null>(null);
  const [tab, setTab] = useState<Tab>("dati");
  const [mostraForm, setMostraForm] = useState(false);
  const [editAtleta, setEditAtleta] = useState<Atleta | undefined>(undefined);
  const [editStorico, setEditStorico] = useState<{ inf: InfortunioStorico; idx: number } | null>(null);
  const [editStoricoForm, setEditStoricoForm] = useState<InfortunioStorico | null>(null);
  const [programmiAtleta, setProgrammiAtleta] = useState<Programma[]>([]);
  const [nuovoReferto, setNuovoReferto] = useState<{ data: string; tipo: TipoReferto | ""; esito: EsitoReferto | ""; note: string } | null>(null);
  const [editingRefertoId, setEditingRefertoId] = useState<string | null>(null);
  const [mostraPunteggioRTS, setMostraPunteggioRTS] = useState(false);
  const [nuovaDataRTS, setNuovaDataRTS] = useState(new Date().toISOString().split("T")[0]);
  const [nuovoPunteggioRTS, setNuovoPunteggioRTS] = useState("");
  const [nuovoInfRTS, setNuovoInfRTS] = useState("__corrente__");
  const [nuovoTipoTestRTS, setNuovoTipoTestRTS] = useState<"TSK" | "AFAQ">("TSK");
  const [copiatoLink, setCopiatoLink] = useState<1 | 2 | null>(null);

  useEffect(() => {
    loadAtleti().then(setAtleti);
    const unsubAtleti = subscribeToAtleti(() => loadAtleti().then(setAtleti));
    const unsubIntake = subscribeToIntakeInsert(() => loadAtleti().then(setAtleti));
    return () => { unsubAtleti(); unsubIntake(); };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const updated = atleti.find((a) => a.id === selected.id);
    if (updated && updated !== selected) setSelected(updated);
  }, [atleti]);

  useEffect(() => {
    if (!selected) { setProgrammiAtleta([]); return; }
    loadProgrammi(selected.id).then(setProgrammiAtleta);
    const unsub = subscribeToProgrammi((atletaId) => {
      if (!atletaId || atletaId === selected.id) {
        loadProgrammi(selected.id).then(setProgrammiAtleta);
      }
    });
    return unsub;
  }, [selected?.id]);

  const apriNuovo = () => { setEditAtleta(undefined); setMostraForm(true); setSelected(null); };
  const apriModifica = (a: Atleta) => { setEditAtleta(a); setMostraForm(true); };

  const apriNuovoInfortunio = (a: Atleta) => {
    const template: Atleta = {
      ...a,
      stato: "Infortunato",
      infortunio: "",
      tipoInfortunio: undefined,
      inizioRehab: "",
      fineRehab: undefined,
      progresso: 0,
    };
    setEditAtleta(template);
    setMostraForm(true);
  };

  const onSalvaAtleta = async (dati: Omit<Atleta, "id">) => {
    try {
      if (editAtleta) {
        let aggiornato: Atleta = { ...dati, id: editAtleta.id };
        // Se l'atleta passa da Infortunato a Disponibile, archivia l'infortunio corrente
        if (editAtleta.stato === "Infortunato" && dati.stato === "Disponibile") {
          const fineRehab = dati.fineRehab ?? new Date().toISOString().slice(0, 10);
          const diagnosi = dati.infortunio || editAtleta.infortunio;
          const inizioRehab = dati.inizioRehab || editAtleta.inizioRehab;
          const tipo = dati.tipoInfortunio || editAtleta.tipoInfortunio;
          if (diagnosi || inizioRehab) {
            const inf: InfortunioStorico = {
              id: uid(),
              tipo,
              diagnosi: diagnosi || "—",
              inizioRehab: inizioRehab || "",
              fineRehab,
              note: dati.note || editAtleta.note || undefined,
            };
            aggiornato = {
              ...aggiornato,
              storicoInfortuni: [...(editAtleta.storicoInfortuni ?? []), inf],
              infortunio: "",
              tipoInfortunio: undefined,
              inizioRehab: "",
              fineRehab: undefined,
              progresso: 100,
            };
          }
        }
        setAtleti((prev) => prev.map((a) => a.id === editAtleta.id ? aggiornato : a));
        setSelected(aggiornato);
        await upsertAtleta(aggiornato);
        syncInjury(aggiornato);
      } else {
        const nuovo = { ...dati, id: uid() };
        setAtleti((prev) => [...prev, nuovo]);
        await upsertAtleta(nuovo);
        syncInjury(nuovo);
      }
      setMostraForm(false);
    } catch (err: any) {
      alert(`Errore nel salvataggio: ${err.message}`);
    }
  };

  const salvaEditStorico = async () => {
    if (!selected || !editStorico || !editStoricoForm) return;
    const nuovoStorico = (selected.storicoInfortuni ?? []).map((inf, i) =>
      i === editStorico.idx ? editStoricoForm : inf
    );
    const aggiornato = { ...selected, storicoInfortuni: nuovoStorico };
    setAtleti((prev) => prev.map((a) => a.id === selected.id ? aggiornato : a));
    setSelected(aggiornato);
    setEditStorico(null); setEditStoricoForm(null);
    await upsertAtleta(aggiornato);
  };

  const ripristinaInfortunio = async (inf: InfortunioStorico, idx: number) => {
    if (!selected) return;
    if (!confirm("Ripristinare questo infortunio come attivo? L'atleta tornerà Infortunato.")) return;
    const nuovoStorico = (selected.storicoInfortuni ?? []).filter((_, i) => i !== idx);
    const aggiornato: Atleta = {
      ...selected,
      stato: "Infortunato",
      infortunio: inf.diagnosi,
      tipoInfortunio: inf.tipo as any,
      inizioRehab: inf.inizioRehab,
      fineRehab: undefined,
      progresso: 0,
      storicoInfortuni: nuovoStorico,
    };
    setAtleti((prev) => prev.map((a) => a.id === selected.id ? aggiornato : a));
    setSelected(aggiornato);
    await upsertAtleta(aggiornato);
  };

  const aggiungiReferto = async () => {
    if (!selected || !nuovoReferto) return;
    if (!nuovoReferto.tipo || !nuovoReferto.esito) return;
    const tipo = nuovoReferto.tipo as TipoReferto;
    const esito = nuovoReferto.esito as EsitoReferto;
    const refertiEsistenti = selected.refertiClinici ?? [];
    let nuoviReferti: RefertoClinico[];
    if (editingRefertoId) {
      nuoviReferti = refertiEsistenti.map((r) =>
        r.id === editingRefertoId
          ? { ...r, data: nuovoReferto.data, tipo, esito, note: nuovoReferto.note || undefined }
          : r
      );
    } else {
      nuoviReferti = [...refertiEsistenti, {
        id: crypto.randomUUID(),
        data: nuovoReferto.data,
        tipo,
        esito,
        note: nuovoReferto.note || undefined,
      }];
    }
    const aggiornato: Atleta = { ...selected, refertiClinici: nuoviReferti };
    aggiornato.progresso = calcolaProgressoAuto(aggiornato);
    setAtleti((prev) => prev.map((a) => a.id === selected.id ? aggiornato : a));
    setSelected(aggiornato);
    setNuovoReferto(null);
    setEditingRefertoId(null);
    await upsertAtleta(aggiornato);
  };

  const rimuoviReferto = async (refertoId: string) => {
    if (!selected) return;
    const aggiornato: Atleta = {
      ...selected,
      refertiClinici: (selected.refertiClinici ?? []).filter((r) => r.id !== refertoId),
    };
    aggiornato.progresso = calcolaProgressoAuto(aggiornato);
    setAtleti((prev) => prev.map((a) => a.id === selected.id ? aggiornato : a));
    setSelected(aggiornato);
    await upsertAtleta(aggiornato);
  };

  const scaricaPDFStorico = async () => {
    if (!selected) return;
    const programmi = await loadProgrammi(selected.id);
    await esportaStoricoCompletoPDF(selected, programmi);
  };

  const salvaQuestionnaire = async (questionari: QuestionarioKinesiofobia[]) => {
    if (!selected) return;
    const aggiornato = { ...selected, questionariKinesiofobia: questionari };
    setAtleti((prev) => prev.map((a) => a.id === selected.id ? aggiornato : a));
    setSelected(aggiornato);
    await upsertAtleta(aggiornato);
  };

  const elimina = async (id: string) => {
    setAtleti((prev) => prev.filter((a) => a.id !== id));
    if (selected?.id === id) setSelected(null);
    await deleteAtleta(id);
  };

  const filtered = atleti.filter((a) => {
    const matchSearch =
      nd(a).toLowerCase().includes(search.toLowerCase()) ||
      a.nome.toLowerCase().includes(search.toLowerCase()) ||
      (a.infortunio ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.tipoInfortunio ?? "").toLowerCase().includes(search.toLowerCase()) ||
      a.categoria.toLowerCase().includes(search.toLowerCase());
    const matchStato = filtroStato === "Tutti" || a.stato === filtroStato;
    return matchSearch && matchStato;
  });

  const perCategoria: Record<string, Atleta[]> = {};
  CATEGORIE.forEach((cat) => {
    const lista = filtered.filter((a) => a.categoria === cat);
    if (lista.length > 0) perCategoria[cat] = lista;
  });

  const countPerStato = (s: Stato | "Tutti") =>
    s === "Tutti" ? atleti.length : atleti.filter((a) => a.stato === s).length;

  return (
    <div className="flex h-full">
      {/* Lista */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Atleti</h1>
            <p className="text-gray-500 mt-1">{atleti.length} atleti nel programma</p>
          </div>
          <button onClick={apriNuovo}
            className="flex items-center gap-2 bg-[#C8102E] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-800">
            <Plus className="w-4 h-4" /> Nuovo Atleta
          </button>
        </div>

        {/* Barra ricerca */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Cerca per nome, infortunio o categoria..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
          />
        </div>

        {/* Filtro per stato */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTRI_STATO.map(({ label, value }) => {
            const count = countPerStato(value);
            return (
              <button key={value} onClick={() => setFiltroStato(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filtroStato === value
                    ? "bg-[#C8102E] text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                }`}>
                {label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filtroStato === value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <User className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">
              {atleti.length === 0 ? "Nessun atleta ancora" : "Nessun risultato"}
            </p>
            <p className="text-gray-300 text-sm mt-1">
              {atleti.length === 0 ? "Clicca \"Nuovo Atleta\" per aggiungerne uno" : "Prova a modificare i filtri di ricerca"}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(perCategoria).map(([cat, lista]) => (
              <div key={cat}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-bold text-[#C8102E] uppercase tracking-widest">{cat}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{lista.length}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="space-y-3">
                  {lista.map((atleta) => (
                    <div key={atleta.id} className="group flex items-center gap-2">
                    <button onClick={() => { setSelected(atleta); setTab("dati"); }}
                      className={`flex-1 min-w-0 bg-white rounded-xl p-4 border text-left transition-all hover:shadow-md ${
                        selected?.id === atleta.id ? "border-[#C8102E] shadow-md" : "border-gray-100"
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                          atleta.stato === "Disponibile" ? "bg-gray-300" : "bg-[#2B2B2B]"
                        }`}>
                          {nd(atleta).trim().split(/\s+/).filter(Boolean).slice(0,2).map((w:string)=>(w[0]??"").toUpperCase()).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={`font-semibold truncate ${atleta.stato === "Disponibile" ? "text-gray-500" : "text-gray-900"}`}>{nd(atleta)}</p>
                            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statoColor[atleta.stato]}`}>
                              {atleta.stato}
                            </span>
                          </div>
                          {atleta.infortunio && (
                            <p className="text-xs text-gray-500 truncate font-medium">{atleta.infortunio}</p>
                          )}
                          <p className="text-xs text-gray-300 truncate mt-0.5">
                            {[atleta.posizione, atleta.tipoInfortunio].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center">
                          <ChevronRight className="w-4 h-4 text-gray-200" />
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Eliminare ${nd(atleta)}?`)) elimina(atleta.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500"
                      title="Elimina atleta">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pannello dettaglio */}
      {selected && !mostraForm && (
        <div className="w-96 bg-white border-l border-gray-100 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              <div className="flex gap-2">
                <button onClick={() => apriModifica(selected)}
                  className="text-xs px-3 py-1.5 border border-[#C8102E] text-[#C8102E] rounded-lg hover:bg-red-50 font-medium">
                  Modifica
                </button>
                <button onClick={() => elimina(selected.id)}
                  className="text-xs px-3 py-1.5 border border-gray-200 text-gray-400 rounded-lg hover:text-red-400 hover:border-red-200">
                  Elimina
                </button>
              </div>
            </div>

            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2 ${
                selected.stato === "Disponibile" ? "bg-gray-400" : "bg-[#2B2B2B]"
              }`}>
                {nd(selected).trim().split(/\s+/).filter(Boolean).slice(0,2).map((w:string)=>(w[0]??"").toUpperCase()).join("")}
              </div>
              <h2 className="font-bold text-gray-900 text-lg">{nd(selected)}</h2>
              <p className="text-sm text-gray-500">{selected.posizione} · {selected.categoria}</p>
              <span className={`text-xs px-3 py-1 rounded-full font-medium mt-1 inline-block ${statoColor[selected.stato]}`}>
                {selected.stato}
              </span>
            </div>

            {selected.stato === "Disponibile" && (
              <button onClick={() => apriNuovoInfortunio(selected)}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-2 rounded-xl text-xs font-semibold hover:bg-orange-600 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Nuovo infortunio
              </button>
            )}

            <div className="flex mt-3 bg-gray-100 rounded-xl p-1">
              {(["dati", "cartella", "storia"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                  }`}>
                  {t === "dati" ? "Dati" : t === "cartella" ? "Cartella" : "Storico"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {tab === "dati" ? (
              <div className="space-y-2.5 text-sm">
                {[
                  ["Piede dominante", selected.piedeDominante || "—"],
                  ["Diagnosi / Infortunio", selected.infortunio || "—"],
                  ["Inizio riabilitazione", selected.inizioRehab ? new Date(selected.inizioRehab + "T12:00").toLocaleDateString("it-IT") : "—"],
                  ...(selected.fineRehab ? [["Fine riabilitazione", new Date(selected.fineRehab + "T12:00").toLocaleDateString("it-IT")]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-medium text-gray-900">{value}</p>
                  </div>
                ))}

                {(selected.tipoInfortunio || selected.evento || selected.meccanismo || selected.contatto || selected.lato || selected.posizioneInfortunio) && (
                  <div className="pt-1 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Dettaglio infortunio</p>
                    <div className="space-y-2">
                      {[
                        ["Tipologia", selected.tipoInfortunio],
                        ["Evento", selected.evento],
                        ["Meccanismo", selected.meccanismo],
                        ["Contatto", selected.contatto],
                        ["Lato", selected.lato],
                        ["Posizione", selected.posizioneInfortunio],
                      ].filter(([, v]) => !!v).map(([label, value]) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="font-medium text-gray-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Referti clinici */}
                {selected.stato === "Infortunato" && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Referti clinici</p>
                      {!nuovoReferto && (
                        <button
                          onClick={() => setNuovoReferto({ data: new Date().toISOString().slice(0, 10), tipo: "", esito: "", note: "" })}
                          className="text-xs text-[#C8102E] font-medium hover:underline flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Aggiungi
                        </button>
                      )}
                    </div>

                    {(selected.refertiClinici ?? []).length === 0 && !nuovoReferto && (
                      <p className="text-xs text-gray-400 italic text-center py-2">Nessun referto registrato</p>
                    )}

                    <div className="space-y-2">
                      {[...(selected.refertiClinici ?? [])].sort((a, b) => b.data.localeCompare(a.data)).map((r) => (
                        <div key={r.id} className="bg-gray-50 rounded-xl p-2.5 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <span className="text-xs font-semibold text-gray-700">{r.tipo}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                r.esito === "Positivo" ? "bg-red-100 text-red-700"
                                : r.esito === "In miglioramento" ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                              }`}>{r.esito}</span>
                            </div>
                            <p className="text-[10px] text-gray-400">{new Date(r.data + "T12:00").toLocaleDateString("it-IT")}</p>
                            {r.note && <p className="text-xs text-gray-500 mt-0.5">{r.note}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setEditingRefertoId(r.id);
                                setNuovoReferto({ data: r.data, tipo: r.tipo, esito: r.esito, note: r.note ?? "" });
                              }}
                              className="text-gray-300 hover:text-[#C8102E] transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => rimuoviReferto(r.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {nuovoReferto && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-3 mt-2 overflow-hidden">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Data</p>
                          {(() => {
                            const [yy, mm, dd] = (nuovoReferto.data || "").split("-");
                            const upd = (y: string, m: string, d: string) =>
                              setNuovoReferto((r) => r && ({ ...r, data: `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}` }));
                            const MESI_IT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
                            const anniOpts = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - 2 + i));
                            const sel = "w-full text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]/30 focus:border-[#C8102E]";
                            return (
                              <div className="grid grid-cols-3 gap-1.5">
                                <div>
                                  <p className="text-[9px] text-gray-400 mb-0.5">Giorno</p>
                                  <select value={dd} onChange={(e) => upd(yy, mm, e.target.value)} className={sel}>
                                    {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2,"0")).map((g) => <option key={g}>{g}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <p className="text-[9px] text-gray-400 mb-0.5">Mese</p>
                                  <select value={mm} onChange={(e) => upd(yy, e.target.value, dd)} className={sel}>
                                    {MESI_IT.map((nm, i) => <option key={nm} value={String(i + 1).padStart(2,"0")}>{nm}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <p className="text-[9px] text-gray-400 mb-0.5">Anno</p>
                                  <select value={yy} onChange={(e) => upd(e.target.value, mm, dd)} className={sel}>
                                    {anniOpts.map((a) => <option key={a}>{a}</option>)}
                                  </select>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Tipo esame</p>
                          <select value={nuovoReferto.tipo}
                            onChange={(e) => setNuovoReferto((r) => r && ({ ...r, tipo: e.target.value as TipoReferto }))}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]/30 focus:border-[#C8102E]">
                            <option value="" disabled>Seleziona tipo…</option>
                            {TIPI_REFERTO.map((t) => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Esito</p>
                          <select value={nuovoReferto.esito}
                            onChange={(e) => setNuovoReferto((r) => r && ({ ...r, esito: e.target.value as EsitoReferto }))}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]/30 focus:border-[#C8102E]">
                            <option value="" disabled>Seleziona esito…</option>
                            {ESITI_REFERTO.map((e) => <option key={e}>{e}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Note <span className="font-normal normal-case text-gray-400">(opzionale)</span></p>
                          <textarea value={nuovoReferto.note}
                            onChange={(e) => setNuovoReferto((r) => r && ({ ...r, note: e.target.value }))}
                            placeholder="Dettagli referto, osservazioni cliniche..."
                            rows={3}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#C8102E]/30 focus:border-[#C8102E]" />
                        </div>
                        <div className="flex gap-2 pt-0.5">
                          <button onClick={() => { setNuovoReferto(null); setEditingRefertoId(null); }}
                            className="flex-1 text-sm border border-gray-200 rounded-lg py-2 text-gray-500 bg-white font-medium hover:bg-gray-100 transition-colors">
                            Annulla
                          </button>
                          <button onClick={aggiungiReferto}
                            className="flex-1 text-sm bg-[#C8102E] text-white rounded-lg py-2 font-semibold hover:bg-red-700 transition-colors">
                            {editingRefertoId ? "Salva" : "Aggiungi"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(selected.telefono || selected.email) && (
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs text-gray-400">Contatti</p>
                    {selected.telefono && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />{selected.telefono}
                      </div>
                    )}
                    {selected.email && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />{selected.email}
                      </div>
                    )}
                  </div>
                )}

                {selected.note && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Note</p>
                    <p className="text-gray-700">{selected.note}</p>
                  </div>
                )}

                {(selected.peso || selected.altezza) && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Dati antropometrici</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selected.peso && (
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-400">Peso</p>
                          <p className="font-semibold text-gray-900">{selected.peso} kg</p>
                        </div>
                      )}
                      {selected.altezza && (
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-400">Altezza</p>
                          <p className="font-semibold text-gray-900">{selected.altezza} cm</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : tab === "cartella" ? (
              <div className="space-y-5">
                {/* ── Questionari RTS (link Office Forms) ── */}
                {(() => {
                  const RTS_LINKS = [
                    {
                      label: "TSK",
                      url: "https://forms.office.com/Pages/ResponsePage.aspx?id=CREOqWwXdkiWTKzKjAALjNSS0wTFlW1DpdKz-oP2BAVUMTNNNlNYM0RJUE44RVZQMEgyQkJBVk5YTy4u",
                    },
                    {
                      label: "AFAQ",
                      url: "https://forms.office.com/pages/responsepage.aspx?id=CREOqWwXdkiWTKzKjAALjNSS0wTFlW1DpdKz-oP2BAVUOE8yTDdPMkpLNUdLTTlQQkVMTFQwTzlaMC4u&route=shorturl",
                    },
                  ] as const;

                  const infortuniOpts = [
                    ...(selected.stato === "Infortunato" && (selected.infortunio || selected.inizioRehab) ? [{
                      id: "__corrente__",
                      label: `In corso: ${selected.infortunio || "—"}`,
                    }] : []),
                    ...[...(selected.storicoInfortuni ?? [])].reverse().map((inf) => ({
                      id: inf.id,
                      label: `${inf.diagnosi}${inf.tipo ? ` (${inf.tipo})` : ""}`,
                    })),
                  ];

                  const punteggioSalva = async () => {
                    const p = parseInt(nuovoPunteggioRTS, 10);
                    if (!nuovaDataRTS || isNaN(p) || p < 0 || p > 100) return;
                    const nuovoQ: QuestionarioKinesiofobia = {
                      id: uid(), data: nuovaDataRTS, risposte: [], punteggio: p,
                      tipoTest: nuovoTipoTestRTS,
                      infortunioId: nuovoInfRTS || undefined,
                    };
                    const aggiornati = [...(selected.questionariKinesiofobia ?? []), nuovoQ];
                    await salvaQuestionnaire(aggiornati);
                    setNuovoPunteggioRTS("");
                    setNuovaDataRTS(new Date().toISOString().split("T")[0]);
                    setMostraPunteggioRTS(false);
                  };

                  const eliminaPunteggio = async (id: string) => {
                    const aggiornati = (selected.questionariKinesiofobia ?? []).filter((q) => q.id !== id);
                    await salvaQuestionnaire(aggiornati);
                  };

                  const copia = (idx: 1 | 2, url: string) => {
                    navigator.clipboard.writeText(url);
                    setCopiatoLink(idx);
                    setTimeout(() => setCopiatoLink(null), 2000);
                  };

                  return (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Questionari RTS</p>
                      {RTS_LINKS.map((lnk, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                          <p className="text-xs font-semibold text-gray-700">{lnk.label}</p>
                          <p className="text-[11px] text-gray-400 break-all leading-relaxed">{lnk.url}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => copia((i + 1) as 1 | 2, lnk.url)}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              {copiatoLink === i + 1 ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiatoLink === i + 1 ? "Copiato!" : "Copia link"}
                            </button>
                            <a
                              href={lnk.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#C8102E] text-white hover:bg-[#a50d26] transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Apri form
                            </a>
                          </div>
                        </div>
                      ))}

                      {/* Punteggi registrati */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Punteggi RTS registrati</p>
                          <button onClick={() => setMostraPunteggioRTS((v) => !v)}
                            className="text-xs font-semibold text-[#C8102E] flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Aggiungi
                          </button>
                        </div>

                        {mostraPunteggioRTS && (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
                            <div className="flex gap-2">
                              <select value={nuovoTipoTestRTS} onChange={(e) => setNuovoTipoTestRTS(e.target.value as "TSK" | "AFAQ")}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white font-semibold">
                                <option value="TSK">TSK</option>
                                <option value="AFAQ">AFAQ</option>
                              </select>
                              <input type="date" value={nuovaDataRTS} onChange={(e) => setNuovaDataRTS(e.target.value)}
                                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
                              <input type="number" min={0} max={100} placeholder="Punteggio (0–100)"
                                value={nuovoPunteggioRTS} onChange={(e) => setNuovoPunteggioRTS(e.target.value)}
                                className="w-36 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
                            </div>
                            {infortuniOpts.length > 0 && (
                              <select value={nuovoInfRTS} onChange={(e) => setNuovoInfRTS(e.target.value)}
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                                {infortuniOpts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                              </select>
                            )}
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setMostraPunteggioRTS(false)}
                                className="text-xs text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 bg-white">Annulla</button>
                              <button onClick={punteggioSalva}
                                className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-[#C8102E] hover:bg-[#a50d26]">Salva</button>
                            </div>
                          </div>
                        )}

                        {(selected.questionariKinesiofobia ?? []).length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Nessun punteggio registrato</p>
                        ) : (
                          <div className="space-y-1.5">
                            {[...(selected.questionariKinesiofobia ?? [])].sort((a, b) => b.data.localeCompare(a.data)).map((q) => {
                              const colore = q.punteggio >= 75 ? "text-green-600" : q.punteggio >= 56 ? "text-orange-500" : "text-red-600";
                              const inf = infortuniOpts.find((o) => o.id === q.infortunioId);
                              return (
                                <div key={q.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2">
                                  <div>
                                    {q.tipoTest && <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mr-2">{q.tipoTest}</span>}
                                    <span className={`text-sm font-bold ${colore}`}>{q.punteggio}/100</span>
                                    <span className="text-xs text-gray-400 ml-2">{new Date(q.data + "T12:00").toLocaleDateString("it-IT")}</span>
                                    {inf && <p className="text-[11px] text-gray-400 mt-0.5">{inf.label}</p>}
                                  </div>
                                  <button onClick={() => eliminaPunteggio(q.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                <div className="border-t border-gray-100 pt-4">
                  <CartellaClinaca
                    atletaId={selected.id}
                    refertiClinici={selected.refertiClinici ?? []}
                    onVaiADati={() => setTab("dati")}
                  />
                </div>
              </div>
            ) : (
              /* ── Storico infortuni ── */
              (() => {
                const storico = selected.storicoInfortuni ?? [];
                const isSessione = (p: Programma) => !p.riposo;
                const giorni = storico.map((inf) => programmiAtleta.filter((p) => p.infortunioId === inf.id && isSessione(p)).length);
                const giorniCorrente = selected.stato === "Infortunato" && selected.inizioRehab
                  ? programmiAtleta.filter((p) => (
                      p.infortunioId === "__corrente__" ||
                      (!p.infortunioId && p.data >= selected.inizioRehab)
                    ) && isSessione(p)).length
                  : 0;
                const totaleStagione = giorni.reduce((s, g) => s + g, 0) + giorniCorrente;

                const fmtData = (d: string) =>
                  d ? new Date(d + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

                return (
                  <div className="space-y-4 text-sm">
                    {/* Stat tiles */}
                    <div className={`grid gap-3 ${selected.stato === "Infortunato" ? "grid-cols-2" : "grid-cols-1"}`}>
                      {selected.stato === "Infortunato" && (
                        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 text-center">
                          <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-widest mb-1">Infortunio attuale</p>
                          <p className="text-3xl font-bold text-orange-600 leading-none">{giorniCorrente}</p>
                          <p className="text-[11px] text-orange-400 mt-1">sessioni</p>
                        </div>
                      )}
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 text-center">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1">Totale stagione</p>
                        <p className="text-3xl font-bold text-gray-700 leading-none">{totaleStagione}</p>
                        <p className="text-[11px] text-gray-400 mt-1">sessioni</p>
                      </div>
                    </div>

                    {/* PDF download */}
                    <button onClick={scaricaPDFStorico}
                      className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 text-xs font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <FileDown className="w-3.5 h-3.5" /> Scarica PDF completo
                    </button>

                    {/* Infortunio corrente */}
                    {selected.stato === "Infortunato" && (selected.infortunio || selected.inizioRehab) && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">In corso</p>
                        <div className="border border-orange-200 rounded-2xl p-4 space-y-2 bg-white">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-gray-900 leading-tight">{selected.infortunio || "—"}</span>
                            <span className="shrink-0 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">
                              {giorniCorrente} sess.
                            </span>
                          </div>
                          {selected.tipoInfortunio && (
                            <p className="text-xs text-gray-400">{selected.tipoInfortunio}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            Dal {fmtData(selected.inizioRehab)} <span className="text-orange-400 font-medium">· in corso</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Storico archiviato */}
                    {storico.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Infortuni precedenti</p>
                        <div className="space-y-2">
                          {[...storico].reverse().map((inf, i) => {
                            const realIdx = storico.length - 1 - i;
                            const isEditing = editStorico?.idx === realIdx;
                            return (
                              <div key={inf.id} className="border border-gray-100 rounded-2xl p-4 space-y-2 bg-white">
                                {isEditing && editStoricoForm ? (
                                  /* ── Form modifica inline ── */
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-xs text-gray-400 mb-0.5">Diagnosi</p>
                                      <input className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                                        value={editStoricoForm.diagnosi}
                                        onChange={(e) => setEditStoricoForm({ ...editStoricoForm, diagnosi: e.target.value })} />
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-400 mb-0.5">Tipo infortunio</p>
                                      <select className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                                        value={editStoricoForm.tipo ?? ""}
                                        onChange={(e) => setEditStoricoForm({ ...editStoricoForm, tipo: e.target.value || undefined })}>
                                        <option value="">—</option>
                                        {TIPI_INFORTUNIO.map((t) => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <p className="text-xs text-gray-400 mb-0.5">Inizio</p>
                                        <input type="date" className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                                          value={editStoricoForm.inizioRehab}
                                          onChange={(e) => setEditStoricoForm({ ...editStoricoForm, inizioRehab: e.target.value })} />
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-400 mb-0.5">Fine</p>
                                        <input type="date" className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                                          value={editStoricoForm.fineRehab}
                                          onChange={(e) => setEditStoricoForm({ ...editStoricoForm, fineRehab: e.target.value })} />
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-400 mb-0.5">Note</p>
                                      <input className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                                        value={editStoricoForm.note ?? ""}
                                        onChange={(e) => setEditStoricoForm({ ...editStoricoForm, note: e.target.value || undefined })} />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                      <button onClick={salvaEditStorico}
                                        className="flex-1 bg-[#C8102E] text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-red-800">
                                        Salva
                                      </button>
                                      <button onClick={() => { setEditStorico(null); setEditStoricoForm(null); }}
                                        className="flex-1 border border-gray-200 text-gray-500 text-xs font-semibold py-1.5 rounded-lg hover:bg-gray-50">
                                        Annulla
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* ── Vista card normale ── */
                                  <>
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="font-semibold text-gray-900 leading-tight flex-1">{inf.diagnosi}</span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
                                          {giorni[realIdx]} sess.
                                        </span>
                                        <button onClick={() => { setEditStorico({ inf, idx: realIdx }); setEditStoricoForm({ ...inf }); }}
                                          className="p-1 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-600" title="Modifica">
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => ripristinaInfortunio(inf, realIdx)}
                                          className="p-1 rounded-lg hover:bg-orange-50 text-gray-300 hover:text-orange-500" title="Ripristina come attivo">
                                          <RotateCcw className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                    {inf.tipo && (
                                      <p className="text-xs text-gray-400">{inf.tipo}</p>
                                    )}
                                    <p className="text-xs text-gray-400">
                                      {fmtData(inf.inizioRehab)} → {fmtData(inf.fineRehab)}
                                    </p>
                                    {inf.note && <p className="text-xs text-gray-400 italic">{inf.note}</p>}
                                    <div className="flex items-center gap-1 text-green-500 pt-0.5">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span className="text-xs font-medium">Recuperato</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {storico.length === 0 && selected.stato === "Disponibile" && (
                      <div className="text-center py-10">
                        <Clock className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Nessun infortunio in archivio</p>
                      </div>
                    )}

                    {storico.length === 0 && selected.stato === "Infortunato" && !selected.infortunio && !selected.inizioRehab && (
                      <div className="text-center py-10">
                        <Clock className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Nessun dato disponibile</p>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Modale form */}
      {mostraForm && (
        <AtletaModal
          atletaIniziale={editAtleta}
          onSalva={onSalvaAtleta}
          onChiudi={() => setMostraForm(false)}
        />
      )}
    </div>
  );
}

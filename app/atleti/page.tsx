"use client";

import { useEffect, useState } from "react";
import { Plus, Search, User, ChevronRight, Phone, Mail, Trash2, AlertTriangle, CheckCircle2, Clock, Pencil, RotateCcw, FileDown, X } from "lucide-react";
import {
  loadAtleti, loadProgrammi, upsertAtleta, deleteAtleta, uid, nd,
  CATEGORIE, TIPI_INFORTUNIO, calcolaPHV,
  type Atleta, type Stato, type InfortunioStorico, type Programma, type QuestionarioKinesiofobia,
} from "@/lib/store";
import AtletaModal from "@/components/AtletaModal";
import CartellaClinaca from "@/components/CartellaClinaca";
import QuestionarioTSK from "@/components/QuestionarioTSK";

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
      doc.text("U.S. Cremonese · Rehab Area – Documento riservato", M, H - 7);
      doc.text(`Pagina ${i} di ${tot}`, W - M, H - 7, { align: "right" });
    }
  };

  const fmtD = (d: string) => d ? new Date(d + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";
  const ggPersi = (i: string, f: string) => { const ms = new Date(f).getTime() - new Date(i).getTime(); return Math.max(0, Math.round(ms / 864e5)); };

  let y = 0;
  const bS = { fontSize: 8.5, cellPadding: 3, overflow: "ellipsize" as const, halign: "left" as const, valign: "middle" as const };
  const aS = { fillColor: [250, 250, 250] as [number, number, number] };
  const hS = (fill: [number, number, number]) => ({ fillColor: fill, textColor: [255, 255, 255] as [number, number, number], fontSize: 7.5, halign: "left" as const, valign: "middle" as const });
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
        const dataStr = prog.data ? fmtD(prog.data) : "—";
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

    checkPage(30, sub);
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
      ["Data di nascita", atleta.dataNascita ? new Date(atleta.dataNascita + "T12:00").toLocaleDateString("it-IT") : "—"],
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
    ],
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 3, overflow: "ellipsize", halign: "left", valign: "middle" },
    columnStyles: { 0: { cellWidth: 58, fontStyle: "bold", textColor: dark }, 1: { textColor: dark } },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: M, right: M },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Storico infortuni ──────────────────────────────────────────────────────
  const storico = atleta.storicoInfortuni ?? [];
  // Giorni persi = numero di sessioni inserite per quell'infortunio (non giorni di calendario)
  const sessStoricoMap = new Map(storico.map((inf) => [inf.id, programmi.filter((p) => p.infortunioId === inf.id).length]));
  const giorniArchivio = storico.map((inf) => sessStoricoMap.get(inf.id) ?? 0);
  const giorniCorrente = atleta.stato === "Infortunato" && atleta.inizioRehab
    ? programmi.filter((p) => !p.infortunioId && p.data >= atleta.inizioRehab).length : 0;
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
      headStyles: { fillColor: red, textColor: 255, fontSize: 7.5 },
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
      y = secTitle("Valutazione psicologica – RTS Score (ACL-RSI adattato)", y);
      autoTable(doc, {
        startY: y,
        head: [["Data", "Punteggio", "Interpretazione"]],
        body: [...injQRTS].sort((a, b) => a.data.localeCompare(b.data)).map((q) => [
          new Date(q.data + "T12:00").toLocaleDateString("it-IT"),
          `${q.punteggio} / 100`,
          interpretaRTS(q.punteggio),
        ]),
        headStyles: hS(dark),
        bodyStyles: bS,
        alternateRowStyles: aS,
        margin: { left: M, right: M },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 28, fontStyle: "bold" } },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
      if (injQRTS.length >= 2) drawChart(injQRTS, sub);
    }

    // Programs for this injury
    if (injProgs.length > 0) {
      checkPage(20, sub);
      y = secTitle(`Sessioni di lavoro — ${injProgs.length} sessioni`, y);
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
    y = secTitle(`Sessioni non associate a nessun infortunio — ${unassigned.length} sessioni`, y);
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

  useEffect(() => { loadAtleti().then(setAtleti); }, []);
  useEffect(() => {
    if (selected) loadProgrammi(selected.id).then(setProgrammiAtleta);
    else setProgrammiAtleta([]);
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
                    <div key={atleta.id} className="relative group">
                    <button onClick={() => { setSelected(atleta); setTab("dati"); }}
                      className={`w-full bg-white rounded-xl p-4 border text-left transition-all hover:shadow-md ${
                        selected?.id === atleta.id ? "border-[#C8102E] shadow-md" : "border-gray-100"
                      }`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${
                          atleta.stato === "Disponibile" ? "bg-gray-400" : "bg-[#2B2B2B]"
                        }`}>
                          {nd(atleta).trim().split(/\s+/).filter(Boolean).slice(0,2).map((w:string)=>(w[0]??"").toUpperCase()).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className={`font-semibold ${atleta.stato === "Disponibile" ? "text-gray-500" : "text-gray-900"}`}>{nd(atleta)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statoColor[atleta.stato]}`}>
                              {atleta.stato}
                            </span>
                            {atleta.tipoInfortunio && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                {atleta.tipoInfortunio}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 truncate">
                            {atleta.posizione}{atleta.infortunio ? ` · ${atleta.infortunio}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xl font-bold ${atleta.stato === "Disponibile" ? "text-green-500" : "text-[#C8102E]"}`}>
                            {atleta.progresso}%
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                      {atleta.infortunio && atleta.stato !== "Disponibile" && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${
                              atleta.progresso >= 80 ? "bg-green-500" : atleta.progresso >= 50 ? "bg-yellow-400" : "bg-orange-500"
                            }`} style={{ width: `${atleta.progresso}%` }} />
                          </div>
                        </div>
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Eliminare ${nd(atleta)}?`)) elimina(atleta.id); }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500"
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
                  ["Data di nascita", selected.dataNascita ? new Date(selected.dataNascita + "T12:00").toLocaleDateString("it-IT") : "—"],
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

                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex justify-between mb-1.5">
                    <p className="text-xs text-gray-400">Progresso recupero</p>
                    <p className="text-xs font-bold text-[#C8102E]">{selected.progresso}%</p>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C8102E] rounded-full" style={{ width: `${selected.progresso}%` }} />
                  </div>
                </div>

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

                {(selected.peso || selected.altezza || selected.altezzaDaSeduto) && (
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
                      {selected.altezzaDaSeduto && (
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-400">Alt. seduto</p>
                          <p className="font-semibold text-gray-900">{selected.altezzaDaSeduto} cm</p>
                        </div>
                      )}
                    </div>
                    {(() => {
                      const phv = calcolaPHV(selected.altezza ?? "", selected.altezzaDaSeduto ?? "", selected.peso ?? "", selected.dataNascita);
                      if (!phv) return null;
                      const postPre = phv.offset >= 0 ? "post-PHV" : "pre-PHV";
                      const colore = phv.offset >= 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-blue-50 border-blue-200 text-blue-800";
                      return (
                        <div className={`mt-2 rounded-xl border p-3 ${colore}`}>
                          <p className="text-xs font-bold uppercase tracking-wide mb-1">PHV – Peak Height Velocity</p>
                          <div className="flex gap-4 text-sm">
                            <div>
                              <span className="text-xs opacity-70">Maturity Offset</span>
                              <p className="font-bold text-sm">
                                {phv.offset >= 0 ? "+" : ""}{phv.offset} anni
                                <span className="text-xs font-normal ml-1 opacity-70">({postPre})</span>
                              </p>
                            </div>
                            <div>
                              <span className="text-xs opacity-70">Età al PHV</span>
                              <p className="font-bold text-sm">{phv.etaPHV} anni</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : tab === "cartella" ? (
              <div className="space-y-5">
                <QuestionarioTSK
                  questionari={selected.questionariKinesiofobia ?? []}
                  atletaNome={selected.nome}
                  infortuni={[
                    ...(selected.stato === "Infortunato" && (selected.infortunio || selected.inizioRehab) ? [{
                      id: "__corrente__",
                      label: `In corso: ${selected.infortunio || "—"}${selected.inizioRehab ? ` · dal ${new Date(selected.inizioRehab + "T12:00").toLocaleDateString("it-IT")}` : ""}`,
                    }] : []),
                    ...[...(selected.storicoInfortuni ?? [])].reverse().map((inf) => ({
                      id: inf.id,
                      label: `${inf.diagnosi}${inf.tipo ? ` (${inf.tipo})` : ""} · ${inf.inizioRehab ? new Date(inf.inizioRehab + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"} → ${inf.fineRehab ? new Date(inf.fineRehab + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}`,
                    })),
                  ]}
                  onSalva={salvaQuestionnaire}
                />
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Documenti</p>
                  <CartellaClinaca atletaId={selected.id} />
                </div>
              </div>
            ) : (
              /* ── Storico infortuni ── */
              (() => {
                const storico = selected.storicoInfortuni ?? [];
                const giorni = storico.map((inf) => programmiAtleta.filter((p) => p.infortunioId === inf.id).length);
                const giorniCorrente = selected.stato === "Infortunato" && selected.inizioRehab
                  ? programmiAtleta.filter((p) => !p.infortunioId && p.data >= selected.inizioRehab).length
                  : 0;
                const totaleStagione = giorni.reduce((s, g) => s + g, 0) + giorniCorrente;

                const fmtData = (d: string) =>
                  d ? new Date(d + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

                return (
                  <div className="space-y-4 text-sm">
                    {/* Riepilogo + download */}
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-6">
                          {selected.stato === "Infortunato" && (
                            <div>
                              <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">Infortunio attuale</p>
                              <p className="text-2xl font-bold text-orange-600">{giorniCorrente} <span className="text-sm font-normal">sess.</span></p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-orange-400 font-semibold uppercase tracking-wide">Totale stagione</p>
                            <p className="text-2xl font-bold text-orange-400">{totaleStagione} <span className="text-sm font-normal">sess.</span></p>
                          </div>
                        </div>
                        <button onClick={scaricaPDFStorico}
                          className="flex items-center gap-1.5 bg-[#C8102E] text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-red-800 transition-colors">
                          <FileDown className="w-3.5 h-3.5" /> PDF completo
                        </button>
                      </div>
                    </div>

                    {/* Infortunio corrente */}
                    {selected.stato === "Infortunato" && (selected.infortunio || selected.inizioRehab) && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">In corso</p>
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-900">{selected.infortunio || "—"}</span>
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                              {giorniCorrente} sess.
                            </span>
                          </div>
                          {selected.tipoInfortunio && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full inline-block">{selected.tipoInfortunio}</span>
                          )}
                          <p className="text-xs text-gray-500">
                            Inizio: {fmtData(selected.inizioRehab)}
                            <span className="ml-2 text-orange-400 font-medium">· in corso</span>
                          </p>
                          <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${selected.progresso}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 text-right">{selected.progresso}% recupero</p>
                        </div>
                      </div>
                    )}

                    {/* Storico archiviato */}
                    {storico.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Infortuni precedenti</p>
                        <div className="space-y-2">
                          {[...storico].reverse().map((inf, i) => {
                            const realIdx = storico.length - 1 - i;
                            const isEditing = editStorico?.idx === realIdx;
                            return (
                              <div key={inf.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-1.5">
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
                                      <span className="font-semibold text-gray-900 flex-1">{inf.diagnosi}</span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                                          {giorni[realIdx]} sess.
                                        </span>
                                        <button onClick={() => { setEditStorico({ inf, idx: realIdx }); setEditStoricoForm({ ...inf }); }}
                                          className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700" title="Modifica">
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => ripristinaInfortunio(inf, realIdx)}
                                          className="p-1 rounded-lg hover:bg-orange-100 text-gray-400 hover:text-orange-600" title="Ripristina come attivo">
                                          <RotateCcw className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                    {inf.tipo && (
                                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full inline-block">{inf.tipo}</span>
                                    )}
                                    <p className="text-xs text-gray-500">
                                      {fmtData(inf.inizioRehab)} → {fmtData(inf.fineRehab)}
                                    </p>
                                    {inf.note && <p className="text-xs text-gray-400 italic">{inf.note}</p>}
                                    <div className="flex items-center gap-1 text-green-600">
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

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Activity, Table2, BarChart3, FileDown, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  loadAtleti, loadProgrammi, nd,
  subscribeToAtleti, subscribeToProgrammi,
  type Atleta, type Programma,
} from "@/lib/store";

// ── Helpers ──────────────────────────────────────────────────────────────────

function pn(s?: string): number | null {
  if (!s?.trim()) return null;
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? null : n;
}

function fv(v: number | null, dec = 0): string {
  if (v === null) return "—";
  return dec > 0 ? v.toFixed(dec) : String(Math.round(v));
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Session {
  data: string;
  dateLabel: string;
  nome: string;
  fase: string;
  infortunio: string;
  rpe: number | null;
  interno: number | null;
  durata: number | null;
  distanza: number | null;
  hsr: number | null;
  velMax: number | null;
  vel21: number | null;
  vel25: number | null;
  acc: number | null;
  dec: number | null;
  sprint: number | null;
  potenza: number | null;
}

function toSession(p: Programma): Session | null {
  const c = p.carico;
  if (!c) return null;
  const s: Session = {
    data: p.data ?? "",
    dateLabel: p.data
      ? new Date(p.data + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })
      : "",
    nome: p.nome ?? "",
    fase: p.fase ?? "",
    infortunio: p.infortunioLabel ?? "",
    rpe: pn(c.rpe),
    interno: pn(c.interno),
    durata: pn(c.durata),
    distanza: pn(c.distanzaTotale),
    hsr: pn(c.hsr),
    velMax: pn(c.velocitaMax),
    vel21: pn(c.velocita21),
    vel25: pn(c.velocita25),
    acc: pn(c.accelerazioni),
    dec: pn(c.decelerazioni),
    sprint: pn(c.sprint),
    potenza: pn(c.potenzaMetabolica),
  };
  const hasData =
    s.rpe != null || s.distanza != null || s.hsr != null ||
    s.velMax != null || s.acc != null || s.interno != null;
  return hasData ? s : null;
}

// ── Metric definitions ────────────────────────────────────────────────────────

interface MetricDef {
  key: keyof Session;
  label: string;
  shortLabel: string;
  unit: string;
  color: string;
  dec: number;
}

const METRICS: MetricDef[] = [
  { key: "rpe",      label: "RPE",                 shortLabel: "RPE",       unit: "",        color: "#C8102E", dec: 1 },
  { key: "durata",   label: "Durata",              shortLabel: "Durata",    unit: "min",     color: "#6b7280", dec: 0 },
  { key: "interno",  label: "Carico Interno",       shortLabel: "Car. Int.", unit: "UA",      color: "#7c3aed", dec: 0 },
  { key: "distanza", label: "Distanza Totale",      shortLabel: "Dist. Tot.", unit: "m",       color: "#2563eb", dec: 0 },
  { key: "hsr",      label: "D>16 km/h",           shortLabel: "D>16 km/h", unit: "m",       color: "#0891b2", dec: 0 },
  { key: "vel21",    label: "D>20 km/h",           shortLabel: "D>20 km/h", unit: "m",       color: "#16a34a", dec: 0 },
  { key: "vel25",    label: "D>25 km/h",           shortLabel: "D>25 km/h", unit: "m",       color: "#15803d", dec: 0 },
  { key: "velMax",   label: "Velocità Max",         shortLabel: "Vel. Max",  unit: "km/h",    color: "#059669", dec: 1 },
  { key: "acc",      label: "Accelerazioni",        shortLabel: "N. Acc.",   unit: "",        color: "#d97706", dec: 0 },
  { key: "dec",      label: "Decelerazioni",        shortLabel: "N. Dec.",   unit: "",        color: "#ea580c", dec: 0 },
  { key: "sprint",   label: "Sprint",               shortLabel: "N. Sprint", unit: "",        color: "#db2777", dec: 0 },
  { key: "potenza",  label: "Potenza Metabolica",   shortLabel: "Potenza",   unit: "W/kg",    color: "#65a30d", dec: 1 },
];

// ── SVG Chart ────────────────────────────────────────────────────────────────

function MetricChart({ sessions, metric }: { sessions: Session[]; metric: MetricDef }) {
  const pts = sessions
    .map((s, i) => ({ i, label: s.dateLabel, v: s[metric.key] as number | null }))
    .filter((p) => p.v !== null) as { i: number; label: string; v: number }[];

  if (pts.length < 2) {
    return (
      <div className="flex items-center justify-center text-gray-300 text-xs" style={{ height: 160 }}>
        Dati insufficienti
      </div>
    );
  }

  const W = 600, H = 180;
  const PAD = { top: 16, right: 16, bottom: 34, left: 46 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const vals = pts.map((p) => p.v);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const span = (rawMax - rawMin) * 0.12 || rawMax * 0.1 || 1;
  const minV = rawMin - span;
  const maxV = rawMax + span;
  const rangeV = maxV - minV;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const n = pts.length;

  const toX = (idx: number) => PAD.left + (idx / Math.max(n - 1, 1)) * cW;
  const toY = (v: number) => PAD.top + (1 - (v - minV) / rangeV) * cH;

  const linePts = pts.map((p) => `${toX(p.i).toFixed(1)},${toY(p.v).toFixed(1)}`).join(" ");
  const areaPts =
    `${toX(pts[0].i).toFixed(1)},${(PAD.top + cH).toFixed(1)} ` +
    linePts +
    ` ${toX(pts[n - 1].i).toFixed(1)},${(PAD.top + cH).toFixed(1)}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD.top + t * cH,
    label: (maxV - t * rangeV).toFixed(metric.dec),
  }));

  const step = n <= 10 ? 1 : n <= 20 ? 2 : Math.ceil(n / 10);
  const gradId = `grad-${metric.key}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={metric.color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={metric.color} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Y grid + labels */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="#e5e7eb" strokeWidth="0.8" />
          <text x={PAD.left - 4} y={t.y + 3.5} textAnchor="end" fontSize="9" fill="#9ca3af">{t.label}</text>
        </g>
      ))}

      {/* Average dashed */}
      <line
        x1={PAD.left} y1={toY(avg)} x2={W - PAD.right} y2={toY(avg)}
        stroke={metric.color} strokeWidth="0.9" strokeDasharray="5,4" opacity="0.4"
      />

      {/* Area */}
      <polygon points={areaPts} fill={`url(#${gradId})`} />

      {/* Line */}
      <polyline
        points={linePts} fill="none"
        stroke={metric.color} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
      />

      {/* Dots + x labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle
            cx={toX(p.i)} cy={toY(p.v)} r="4"
            fill={metric.color} stroke="white" strokeWidth="1.5"
          />
          {i % step === 0 && (
            <text x={toX(p.i)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="8.5" fill="#6b7280">
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const RED = "#C8102E";
const RED_RGB: [number, number, number] = [200, 16, 46];
const DARK_RGB: [number, number, number] = [43, 43, 43];
const GRAY_RGB: [number, number, number] = [100, 100, 100];

export default function PerformancePage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [programmi, setProgrammi] = useState<Programma[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"grafici" | "tabella">("grafici");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadAtleti(), loadProgrammi()]).then(([a, p]) => {
      setAtleti(a);
      setProgrammi(p);
      setLoading(false);
    });
    const ua = subscribeToAtleti(() => loadAtleti().then(setAtleti));
    const up = subscribeToProgrammi(() => loadProgrammi().then(setProgrammi));
    return () => { ua(); up(); };
  }, []);

  // Athletes who have ≥1 session with GPS/RPE data
  const atletiConDati = useMemo(() => {
    const ids = new Set(
      programmi.filter((p) => toSession(p) !== null).map((p) => p.atletaId)
    );
    return atleti
      .filter((a) => ids.has(a.id))
      .sort((a, b) => nd(a).localeCompare(nd(b)));
  }, [atleti, programmi]);

  useEffect(() => {
    if (!selectedId && atletiConDati.length > 0) setSelectedId(atletiConDati[0].id);
  }, [atletiConDati, selectedId]);

  const sessions = useMemo((): Session[] => {
    if (!selectedId) return [];
    return programmi
      .filter((p) => p.atletaId === selectedId)
      .map(toSession)
      .filter((s): s is Session => s !== null)
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [programmi, selectedId]);

  const selectedAtleta = atleti.find((a) => a.id === selectedId) ?? null;
  const idx = atletiConDati.findIndex((a) => a.id === selectedId);

  // Metrics that have ≥1 non-null value for this athlete
  const activeMetrics = METRICS.filter((m) => sessions.some((s) => s[m.key] != null));

  // ── Stat helpers ────────────────────────────────────────────────────────────
  function lastVal(key: keyof Session, dec: number): string {
    const vals = sessions.map((s) => s[key] as number | null).filter((v) => v != null) as number[];
    return vals.length ? fv(vals[vals.length - 1], dec) : "—";
  }

  function trend(key: keyof Session): "up" | "down" | "flat" | "none" {
    const vals = sessions.map((s) => s[key] as number | null).filter((v) => v != null) as number[];
    if (vals.length < 2) return "none";
    const diff = ((vals[vals.length - 1] - vals[vals.length - 2]) / (Math.abs(vals[vals.length - 2]) || 1)) * 100;
    if (Math.abs(diff) < 3) return "flat";
    return diff > 0 ? "up" : "down";
  }

  function avgVal(key: keyof Session, dec: number): string {
    const vals = sessions.map((s) => s[key] as number | null).filter((v) => v != null) as number[];
    if (!vals.length) return "—";
    return fv(vals.reduce((a, b) => a + b, 0) / vals.length, dec);
  }

  function maxVal(key: keyof Session, dec: number): string {
    const vals = sessions.map((s) => s[key] as number | null).filter((v) => v != null) as number[];
    if (!vals.length) return "—";
    return fv(Math.max(...vals), dec);
  }

  // ── PDF ─────────────────────────────────────────────────────────────────────
  function exportPdf() {
    if (!selectedAtleta || !sessions.length) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const PW = 297, PH = 210, M = 14;

    function hexRgb(hex: string): [number, number, number] {
      const h = hex.replace("#", "");
      return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    }

    // Full header (first page), compact header (continuation pages)
    // Returns the y position where content can start
    const addHeader = (compact?: boolean): number => {
      if (compact) {
        doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...RED_RGB);
        doc.text(`U.S. Cremonese – Performance  ·  ${nd(selectedAtleta!)}`, M, 10);
        doc.setDrawColor(...RED_RGB); doc.setLineWidth(0.3);
        doc.line(M, 12.5, PW - M, 12.5);
        return 16;
      }
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...RED_RGB);
      doc.text("U.S. Cremonese", M, 15);
      doc.setFontSize(9); doc.setFont("helvetica", "bolditalic"); doc.setTextColor(...GRAY_RGB);
      doc.text("Rehab Area – Performance", M, 19);
      doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY_RGB);
      doc.text(`${nd(selectedAtleta!)}  ·  ${selectedAtleta!.categoria}`, M, 24);
      doc.setDrawColor(...RED_RGB); doc.setLineWidth(0.5);
      doc.line(M, 27, PW - M, 27);
      return 32;
    };

    // Draw a single line chart for metric m at position (cx, cy) with size (cw × ch)
    function drawChart(m: MetricDef, cx: number, cy: number, cw: number, ch: number) {
      const pts = sessions
        .map((s) => ({ label: s.dateLabel, v: s[m.key] as number | null }))
        .filter((p) => p.v !== null) as { label: string; v: number }[];
      if (pts.length < 2) return;

      const [cr, cg, cb] = hexRgb(m.color);
      const PAD = { top: 9, right: 4, bottom: 10, left: 17 };
      const iW = cw - PAD.left - PAD.right;
      const iH = ch - PAD.top - PAD.bottom;
      const n = pts.length;

      const vals = pts.map((p) => p.v);
      const dMin = Math.min(...vals);
      const dMax = Math.max(...vals);
      const dAvg = vals.reduce((a, b) => a + b, 0) / n;
      const dSpan = (dMax - dMin) * 0.12 || dMax * 0.1 || 1;
      const vMin = dMin - dSpan;
      const vMax = dMax + dSpan;
      const vRange = vMax - vMin;

      const px = (i: number) => cx + PAD.left + (i / Math.max(n - 1, 1)) * iW;
      const py = (v: number) => cy + PAD.top + (1 - (v - vMin) / vRange) * iH;
      const botY = cy + PAD.top + iH;

      // Card background + border
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(cx, cy, cw, ch, 1.5, 1.5, "F");
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.15);
      doc.roundedRect(cx, cy, cw, ch, 1.5, 1.5, "S");

      // Title (metric name + unit)
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(cr, cg, cb);
      doc.text(`${m.label}${m.unit ? ` (${m.unit})` : ""}`, cx + PAD.left, cy + 5.5);

      // Stats in top-right
      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      const statStr = `Ult: ${fv(vals[n-1], m.dec)}  ·  Med: ${fv(dAvg, m.dec)}  ·  Max: ${fv(dMax, m.dec)}`;
      doc.text(statStr, cx + cw - PAD.right, cy + 5.5, { align: "right" });

      // Y grid + tick labels
      [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
        const gy = cy + PAD.top + t * iH;
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.15);
        doc.line(cx + PAD.left, gy, cx + cw - PAD.right, gy);
        doc.setFontSize(4.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(165, 165, 165);
        doc.text((vMax - t * vRange).toFixed(m.dec), cx + PAD.left - 1, gy + 1.5, { align: "right" });
      });

      // Area fill — lightened tint of the metric color
      const lr = Math.round(cr * 0.12 + 255 * 0.88);
      const lg = Math.round(cg * 0.12 + 255 * 0.88);
      const lb = Math.round(cb * 0.12 + 255 * 0.88);
      doc.setFillColor(lr, lg, lb);
      const segs: number[][] = [[0, py(pts[0].v) - botY]];
      for (let i = 1; i < n; i++) {
        segs.push([px(i) - px(i - 1), py(pts[i].v) - py(pts[i - 1].v)]);
      }
      segs.push([0, botY - py(pts[n - 1].v)]);
      doc.lines(segs, px(0), botY, [1, 1], "F", true);

      // Average dashed line
      doc.setDrawColor(cr, cg, cb);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.line(cx + PAD.left, py(dAvg), cx + cw - PAD.right, py(dAvg));
      doc.setLineDashPattern([], 0);

      // Main line
      doc.setDrawColor(cr, cg, cb);
      doc.setLineWidth(0.8);
      for (let i = 0; i < n - 1; i++) {
        doc.line(px(i), py(pts[i].v), px(i + 1), py(pts[i + 1].v));
      }

      // Dots (skip some when many points to avoid clutter)
      doc.setFillColor(cr, cg, cb);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.35);
      const dotStep = n <= 30 ? 1 : 2;
      pts.forEach((p, i) => {
        if (i % dotStep === 0) doc.circle(px(i), py(p.v), 0.9, "FD");
      });

      // X-axis date labels
      const lblStep = n <= 12 ? 1 : n <= 24 ? 2 : Math.ceil(n / 12);
      doc.setFontSize(4.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      pts.forEach((p, i) => {
        if (i % lblStep === 0) doc.text(p.label, px(i), cy + ch - 1, { align: "center" });
      });
    }

    // ── Pagina 1: header + tabella sessioni + tabella riepilogo ───────────────
    let y = addHeader();

    // Tabella sessioni (inizia nella pagina 1, può andare in overflow)
    const tblGps = activeMetrics.filter((m) => m.key !== "rpe" && m.key !== "interno" && m.key !== "durata");
    const tblBase = [METRICS.find((m) => m.key === "rpe")!, METRICS.find((m) => m.key === "interno")!]
      .filter(Boolean).filter((m) => activeMetrics.includes(m));
    const tblMetrics = [...tblBase, ...tblGps];
    // Data=18 + Infortunio=32 + Programma=40 + Fase=20 = 110 fixed
    const tblFixedW = 110;
    const tblMW = tblMetrics.length ? Math.floor((269 - tblFixedW) / tblMetrics.length) : 0;
    const tblCols: Record<number, any> = {
      0: { cellWidth: 18 },
      1: { cellWidth: 32, halign: "left" },
      2: { cellWidth: 40, halign: "left" },
      3: { cellWidth: 20, halign: "left" },
    };
    tblMetrics.forEach((_, i) => { tblCols[i + 4] = { cellWidth: tblMW }; });

    autoTable(doc, {
      startY: y,
      head: [["Data", "Infortunio", "Programma", "Fase", ...tblMetrics.map((m) => `${m.shortLabel}${m.unit ? `\n(${m.unit})` : ""}`)]],
      body: sessions.map((s) => [
        s.dateLabel || s.data,
        s.infortunio || "—",
        s.nome || "—",
        s.fase || "—",
        ...tblMetrics.map((m) => fv(s[m.key] as number | null, m.dec)),
      ]),
      headStyles: { fillColor: DARK_RGB, textColor: 255, fontSize: 6.5, halign: "center", valign: "middle" },
      bodyStyles: { fontSize: 6.5, cellPadding: 1.8, halign: "center", valign: "middle", overflow: "linebreak" },
      columnStyles: tblCols,
      alternateRowStyles: { fillColor: [249, 249, 249] },
      margin: { left: M, right: M, top: 18 },
      didDrawPage: (() => {
        let first = true;
        return () => { if (first) { first = false; } else { addHeader(true); } };
      })(),
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Tabella riepilogo Ultima / Media / Max (prime 6 metriche attive)
    const statCols = activeMetrics.slice(0, 6);
    if (statCols.length) {
      // Se non c'è spazio sufficiente, vai su nuova pagina
      if (y + 30 > PH - M) {
        doc.addPage();
        y = addHeader(true);
      }
      autoTable(doc, {
        startY: y,
        head: [statCols.map((m) => `${m.label}${m.unit ? ` (${m.unit})` : ""}`)],
        body: [
          statCols.map((m) => `Ultima: ${lastVal(m.key, m.dec)}`),
          statCols.map((m) => `Media: ${avgVal(m.key, m.dec)}`),
          statCols.map((m) => `Max: ${maxVal(m.key, m.dec)}`),
        ],
        headStyles: { fillColor: DARK_RGB, textColor: 255, fontSize: 7, halign: "center" },
        bodyStyles: { fontSize: 7, cellPadding: 2, halign: "center" },
        alternateRowStyles: { fillColor: [249, 249, 249] },
        margin: { left: M, right: M },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ── Grafici — pagine successive alle tabelle ───────────────────────────
    const CHART_W = (269 - 6) / 2;
    const CHART_H = 48;
    const GAP_Y = 5;

    doc.addPage();
    y = addHeader(true);

    for (let i = 0; i < activeMetrics.length; i += 2) {
      if (y + CHART_H > PH - M) {
        doc.addPage();
        y = addHeader(true);
      }
      drawChart(activeMetrics[i], M, y, CHART_W, CHART_H);
      if (i + 1 < activeMetrics.length) {
        drawChart(activeMetrics[i + 1], M + CHART_W + 6, y, CHART_W, CHART_H);
      }
      y += CHART_H + GAP_Y;
    }

    // Page numbers
    const pages = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY_RGB);
      doc.text(`${p} / ${pages}`, PW - M, 205, { align: "right" });
    }

    doc.save(`performance_${nd(selectedAtleta!).replace(/ /g, "_")}.pdf`);
  }

  // ── Trend icon ───────────────────────────────────────────────────────────────
  function TrendIcon({ t }: { t: ReturnType<typeof trend> }) {
    if (t === "up") return <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />;
    if (t === "down") return <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />;
    if (t === "flat") return <Minus className="w-4 h-4 text-gray-400 shrink-0" />;
    return null;
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Caricamento…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: RED }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Performance</h1>
              <p className="text-sm text-gray-500">Andamento GPS e carico in riabilitazione</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setView("grafici")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  view === "grafici" ? "text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
                style={view === "grafici" ? { backgroundColor: RED } : {}}
              >
                <BarChart3 className="w-4 h-4" />
                Grafici
              </button>
              <button
                onClick={() => setView("tabella")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  view === "tabella" ? "text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
                style={view === "tabella" ? { backgroundColor: RED } : {}}
              >
                <Table2 className="w-4 h-4" />
                Tabella
              </button>
            </div>

            {/* PDF */}
            <button
              onClick={exportPdf}
              disabled={!selectedAtleta || sessions.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: RED }}
            >
              <FileDown className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Athlete selector ─────────────────────────────────────────────────── */}
      {atletiConDati.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
          <div className="flex items-center gap-2 max-w-md">
            <button
              onClick={() => idx > 0 && setSelectedId(atletiConDati[idx - 1].id)}
              disabled={idx <= 0}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer"
            >
              <option value="">— Seleziona atleta —</option>
              {atletiConDati.map((a) => (
                <option key={a.id} value={a.id}>
                  {nd(a)}{a.categoria ? ` — ${a.categoria}` : ""}
                </option>
              ))}
            </select>

            <button
              onClick={() => idx < atletiConDati.length - 1 && setSelectedId(atletiConDati[idx + 1].id)}
              disabled={idx >= atletiConDati.length - 1}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Empty states */}
        {atletiConDati.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Activity className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Nessun dato GPS disponibile</p>
            <p className="text-gray-400 text-sm mt-1">Inserisci i dati GPS nella sezione Programmi</p>
          </div>
        )}

        {atletiConDati.length > 0 && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Activity className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Nessun dato GPS per questo atleta</p>
          </div>
        )}

        {sessions.length > 0 && (
          <>
            {/* ── KPI strip ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-5">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Sessioni</p>
                <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
              </div>
              {activeMetrics.map((m) => {
                const t = trend(m.key);
                return (
                  <div key={m.key} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                      {m.shortLabel}{m.unit && ` (${m.unit})`}
                    </p>
                    <div className="flex items-end gap-1.5">
                      <span className="text-2xl font-bold text-gray-900">{lastVal(m.key, m.dec)}</span>
                      <TrendIcon t={t} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">media {avgVal(m.key, m.dec)}</p>
                  </div>
                );
              })}
            </div>

            {/* ── GRAFICI ────────────────────────────────────────────────────── */}
            {view === "grafici" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeMetrics.map((m) => {
                  const t = trend(m.key);
                  const isExpanded = expandedKey === m.key;
                  return (
                    <div
                      key={m.key}
                      className={`bg-white rounded-xl border border-gray-200 p-4 ${isExpanded ? "lg:col-span-2" : ""}`}
                    >
                      {/* Card header */}
                      <div className="mb-3">
                        {/* Row 1: title + expand */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                            <span className="font-semibold text-gray-800 text-sm">{m.label}</span>
                            {m.unit && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{m.unit}</span>
                            )}
                          </div>
                          <button
                            onClick={() => setExpandedKey(isExpanded ? null : m.key)}
                            className="text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                          >
                            {isExpanded ? "Riduci ↙" : "Espandi ↗"}
                          </button>
                        </div>
                        {/* Row 2: stats */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Ultimo</span>
                            <span className="text-base font-bold" style={{ color: m.color }}>{lastVal(m.key, m.dec)}</span>
                            <TrendIcon t={t} />
                          </div>
                          <div className="w-px h-4 bg-gray-200" />
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">Media</span>
                            <span className="text-sm font-semibold text-gray-700">{avgVal(m.key, m.dec)}</span>
                          </div>
                          <div className="w-px h-4 bg-gray-200" />
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">Max</span>
                            <span className="text-sm font-semibold text-gray-700">{maxVal(m.key, m.dec)}</span>
                          </div>
                        </div>
                      </div>
                      <MetricChart sessions={sessions} metric={m} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TABELLA ────────────────────────────────────────────────────── */}
            {view === "tabella" && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {["Data", "Infortunio", "Programma", "Fase"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                        {activeMetrics.map((m) => (
                          <th key={m.key} className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {m.shortLabel}
                            {m.unit && <span className="text-gray-400 lowercase font-normal"> {m.unit}</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...sessions].reverse().map((s, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap text-xs font-mono">
                            {s.data ? new Date(s.data + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[120px] truncate">{s.infortunio || "—"}</td>
                          <td className="px-4 py-2.5 text-gray-800 font-medium max-w-[160px] truncate">{s.nome || "—"}</td>
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{s.fase || "—"}</td>
                          {activeMetrics.map((m) => {
                            const v = s[m.key] as number | null;
                            return (
                              <td key={m.key} className="px-3 py-2.5 text-center whitespace-nowrap">
                                {v != null ? (
                                  <span className="font-mono text-gray-800 text-xs">{fv(v, m.dec)}</span>
                                ) : (
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>

                    {/* Footer: averages */}
                    <tfoot>
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <td className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide" colSpan={4}>
                          Media
                        </td>
                        {activeMetrics.map((m) => (
                          <td key={m.key} className="px-3 py-2.5 text-center">
                            <span className="text-xs font-semibold text-gray-600">{avgVal(m.key, m.dec)}</span>
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide" colSpan={4}>
                          Massimo
                        </td>
                        {activeMetrics.map((m) => (
                          <td key={m.key} className="px-3 py-2.5 text-center">
                            <span className="text-xs font-semibold text-gray-600">{maxVal(m.key, m.dec)}</span>
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

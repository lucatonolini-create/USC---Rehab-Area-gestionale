"use client";

import { useEffect, useState } from "react";
import { Plus, Search, User, ChevronRight, Phone, Mail, Trash2, AlertTriangle, CheckCircle2, Clock, Pencil, RotateCcw, FileDown, X } from "lucide-react";
import {
  loadAtleti, loadProgrammi, upsertAtleta, deleteAtleta, uid,
  CATEGORIE, TIPI_INFORTUNIO, calcolaPHV,
  type Atleta, type Stato, type InfortunioStorico, type Programma,
} from "@/lib/store";
import AtletaModal from "@/components/AtletaModal";
import CartellaClinaca from "@/components/CartellaClinaca";

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
    doc.setTextColor(...red); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("U.S. Cremonese – Scheda Completa Atleta", tx, 13);
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

  const fmtD = (d: string) => d ? new Date(d + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";
  const ggPersi = (i: string, f: string) => { const ms = new Date(f).getTime() - new Date(i).getTime(); return Math.max(0, Math.round(ms / 864e5)); };

  // ── Pagina 1: dati atleta ──────────────────────────────────────────────────
  addHeader();
  doc.setTextColor(...dark); doc.setFontSize(17); doc.setFont("helvetica", "bold");
  doc.text(atleta.nome, M, HDR + 13);
  const info = [atleta.categoria, atleta.posizione, atleta.piedeDominante ? `Piede ${atleta.piedeDominante}` : ""].filter(Boolean).join("  ·  ");
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray);
  doc.text(info, M, HDR + 21);
  const badgeColor: [number, number, number] = atleta.stato === "Disponibile" ? [34, 139, 34] : red;
  doc.setFillColor(...badgeColor); doc.roundedRect(W - M - 36, HDR + 7, 36, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  doc.text(atleta.stato, W - M - 18, HDR + 13.5, { align: "center" });
  doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.3); doc.line(M, HDR + 27, W - M, HDR + 27);

  let y = HDR + 34;
  y = secTitle("Dati clinici", y);
  autoTable(doc, {
    startY: y,
    body: [
      ["Categoria / Ruolo", `${atleta.categoria}  ·  ${atleta.posizione || "—"}`],
      ["Piede dominante", atleta.piedeDominante || "—"],
      ["Stato attuale", atleta.stato],
      ...(atleta.peso || atleta.altezza ? [["Peso / Altezza", `${atleta.peso || "—"} kg  ·  ${atleta.altezza || "—"} cm`]] : [] as any),
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
  const giorniArchivio = storico.map((inf) => ggPersi(inf.inizioRehab, inf.fineRehab));
  const giorniCorrente = atleta.stato === "Infortunato" && atleta.inizioRehab
    ? ggPersi(atleta.inizioRehab, new Date().toISOString().slice(0, 10)) : 0;
  const totaleGiorni = giorniArchivio.reduce((s, g) => s + g, 0) + giorniCorrente;

  y = secTitle(`Storico infortuni — ${totaleGiorni} giorni persi totali`, y);

  const storicoBody: any[] = [];
  // Infortunio corrente se in corso
  if (atleta.stato === "Infortunato" && (atleta.infortunio || atleta.inizioRehab)) {
    storicoBody.push([`${atleta.infortunio || "—"}${atleta.tipoInfortunio ? ` (${atleta.tipoInfortunio})` : ""}`, fmtD(atleta.inizioRehab), "In corso", `${giorniCorrente} gg`]);
  }
  // Infortuni archiviati (più recente prima)
  [...storico].reverse().forEach((inf, i) => {
    storicoBody.push([`${inf.diagnosi}${inf.tipo ? ` (${inf.tipo})` : ""}`, fmtD(inf.inizioRehab), fmtD(inf.fineRehab), `${giorniArchivio[storico.length - 1 - i]} gg`]);
  });

  if (storicoBody.length) {
    autoTable(doc, {
      startY: y,
      head: [["Diagnosi / Infortunio", "Inizio", "Fine", "Giorni persi"]],
      body: storicoBody,
      headStyles: { fillColor: red, textColor: 255, fontSize: 7.5 },
      bodyStyles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak", halign: "left", valign: "middle" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: M, right: M },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 28 }, 2: { cellWidth: 28 }, 3: { cellWidth: 28, halign: "center" } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  } else {
    doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text("Nessun infortunio registrato.", M, y); y += 10;
  }

  // ── Pagine programmi ──────────────────────────────────────────────────────
  programmi.forEach((prog) => {
    doc.addPage();
    const dataStr = prog.data ? new Date(prog.data + "T12:00").toLocaleDateString("it-IT") : "";
    addHeader(`${atleta.nome}  ·  ${prog.nome}${prog.fase ? ` – ${prog.fase}` : ""}${dataStr ? `  ·  ${dataStr}` : ""}`);
    y = HDR + 8;

    if (prog.esercizi?.length) {
      y = secTitle("Palestra", y);
      autoTable(doc, {
        startY: y,
        head: [["#", "Esercizio", "Serie", "Reps", "Carico", "RIR", "VAS", "Note"]],
        body: prog.esercizi.map((e, i) => [i + 1, e.nome, e.serie || "—", e.reps || "—", e.carico || "—", e.rir || "—", e.vas ? `${e.vas}/10` : "—", e.note || ""]),
        headStyles: { fillColor: red, textColor: 255, fontSize: 7.5 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5, overflow: "ellipsize", halign: "left", valign: "middle" },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: M, right: M },
        columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 50 }, 2: { cellWidth: 12 }, 3: { cellWidth: 18 }, 4: { cellWidth: 20 }, 5: { cellWidth: 10 }, 6: { cellWidth: 14 } },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (prog.esercizicampo?.length) {
      y = secTitle("Esercizi in campo", y);
      autoTable(doc, {
        startY: y,
        head: [["#", "Tipo", "Serie", "Durata", "Descrizione"]],
        body: prog.esercizicampo.map((c, i) => [i + 1, c.tipo || "—", c.serie || "—", c.durata || "—", c.descrizione || ""]),
        headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255], fontSize: 7.5 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5, halign: "left", valign: "middle" },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: M, right: M },
        columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 38 }, 2: { cellWidth: 14 }, 3: { cellWidth: 22 } },
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
        autoTable(doc, { startY: y, body: rows, theme: "striped", styles: { fontSize: 8, cellPadding: 2.5, overflow: "ellipsize", halign: "left", valign: "middle" }, columnStyles: { 0: { cellWidth: 45, fontStyle: "bold", textColor: dark } }, alternateRowStyles: { fillColor: [250, 250, 250] }, margin: { left: M, right: W / 2 } });
        y = (doc as any).lastAutoTable.finalY + 6;
      }
    }

    if (prog.tests?.length) {
      y = secTitle("Test fisioterapici e di performance", y);
      autoTable(doc, {
        startY: y,
        head: [["#", "Test", "Sx", "Dx", "Risultato", "Unità", "Note"]],
        body: prog.tests.map((t, i) => [i + 1, t.nome, t.risultatoSx || "—", t.risultatoDx || "—", t.risultato || "—", t.unita || "—", t.note || ""]),
        headStyles: { fillColor: dark, textColor: 255, fontSize: 7.5 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5, overflow: "ellipsize", halign: "left", valign: "middle" },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: M, right: M },
        columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 52 }, 2: { cellWidth: 16 }, 3: { cellWidth: 16 }, 4: { cellWidth: 20 } },
      });
    }
  });

  addFooter();
  doc.save(`${atleta.nome.replace(/ /g, "_")}_storico_completo.pdf`);
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

  useEffect(() => { loadAtleti().then(setAtleti); }, []);

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
      } else {
        const nuovo = { ...dati, id: uid() };
        setAtleti((prev) => [...prev, nuovo]);
        await upsertAtleta(nuovo);
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

  const elimina = async (id: string) => {
    setAtleti((prev) => prev.filter((a) => a.id !== id));
    if (selected?.id === id) setSelected(null);
    await deleteAtleta(id);
  };

  const filtered = atleti.filter((a) => {
    const matchSearch =
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
                          {atleta.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className={`font-semibold ${atleta.stato === "Disponibile" ? "text-gray-500" : "text-gray-900"}`}>{atleta.nome}</p>
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
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Eliminare ${atleta.nome}?`)) elimina(atleta.id); }}
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
                {selected.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <h2 className="font-bold text-gray-900 text-lg">{selected.nome}</h2>
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
                {selected.tipoInfortunio && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <p className="text-xs text-gray-400">Tipo infortunio</p>
                    <p className="font-semibold text-gray-600">{selected.tipoInfortunio}</p>
                  </div>
                )}
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
              <CartellaClinaca atletaId={selected.id} />
            ) : (
              /* ── Storico infortuni ── */
              (() => {
                const storico = selected.storicoInfortuni ?? [];
                const giorni = storico.map((inf) => giorniPersi(inf.inizioRehab, inf.fineRehab));
                const totaleArchivio = giorni.reduce((s, g) => s + g, 0);
                const giorniCorrente = selected.stato === "Infortunato" && selected.inizioRehab
                  ? giorniPersi(selected.inizioRehab, new Date().toISOString().slice(0, 10))
                  : 0;
                const totale = totaleArchivio + giorniCorrente;

                const fmtData = (d: string) =>
                  d ? new Date(d + "T12:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

                return (
                  <div className="space-y-4 text-sm">
                    {/* Riepilogo + download */}
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">Giorni persi totali</p>
                        <p className="text-2xl font-bold text-orange-600">{totale}</p>
                      </div>
                      <button onClick={scaricaPDFStorico}
                        className="flex items-center gap-1.5 bg-[#C8102E] text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-red-800 transition-colors">
                        <FileDown className="w-3.5 h-3.5" /> PDF completo
                      </button>
                    </div>

                    {/* Infortunio corrente */}
                    {selected.stato === "Infortunato" && (selected.infortunio || selected.inizioRehab) && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">In corso</p>
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-900">{selected.infortunio || "—"}</span>
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                              {giorniCorrente} gg
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
                                          {giorni[realIdx]} gg
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

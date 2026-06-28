"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Download, FileText, Calendar, Filter } from "lucide-react";
import {
  loadAtleti, loadProgrammi, saveAtleti,
  CATEGORIE, type Atleta, type Stato, type Programma,
} from "@/lib/store";

const STATI: Stato[] = ["In recupero", "Quasi guarito", "Guarito"];
const statoColor: Record<Stato, string> = {
  "In recupero":  "bg-blue-100 text-blue-700",
  "Quasi guarito":"bg-green-100 text-green-700",
  "Guarito":      "bg-gray-100 text-gray-600",
};

async function esportaExcel(atleta: Atleta, programmi: Programma[]) {
  const { utils, writeFile } = await import("xlsx");
  const wb = utils.book_new();
  const infoRows = [
    ["SCHEDA RIABILITATIVA", ""],
    [""],
    ["Nome", atleta.nome],
    ["Data di nascita", atleta.dataNascita ? new Date(atleta.dataNascita + "T12:00").toLocaleDateString("it-IT") : ""],
    ["Categoria", atleta.categoria],
    ["Ruolo", atleta.posizione],
    ["Piede dominante", atleta.piedeDominante],
    ["Infortunio", atleta.infortunio],
    ["Inizio riabilitazione", atleta.inizioRehab ? new Date(atleta.inizioRehab + "T12:00").toLocaleDateString("it-IT") : ""],
    ["Fine riabilitazione", atleta.fineRehab ? new Date(atleta.fineRehab + "T12:00").toLocaleDateString("it-IT") : ""],
    ["Fisioterapista", atleta.fisioterapista],
    ["Stato attuale", atleta.stato],
    ["Progresso recupero", `${atleta.progresso}%`],
    ["Note", atleta.note],
  ];
  const wsInfo = utils.aoa_to_sheet(infoRows);
  utils.book_append_sheet(wb, wsInfo, "Atleta");

  programmi.forEach((prog, idx) => {
    const rows = [
      ["PROGRAMMA DI LAVORO", ""],
      ["Nome", prog.nome],
      ["Fase", prog.fase],
      ["Data", prog.data ? new Date(prog.data + "T12:00").toLocaleDateString("it-IT") : ""],
      [""],
      ["ESERCIZI"],
      ["#", "Esercizio", "Serie", "Reps/Durata", "RPE (0-10)", "VAS (0-10)", "Note"],
      ...prog.esercizi.map((e, i) => [i + 1, e.nome, e.serie, e.reps, e.rpe, e.vas, e.note]),
    ];
    if (prog.tests?.length) {
      rows.push([""], ["TEST FISIOMETRICI E DI PERFORMANCE"]);
      rows.push(["#", "Test", "Risultato", "Unità", "Note"]);
      prog.tests.forEach((t, i) => rows.push([i + 1, t.nome, t.risultato, t.unita, t.note]));
    }
    if (prog.carico) {
      const c = prog.carico;
      rows.push([""], ["CARICO SESSIONE"]);
      if (c.durata) rows.push(["Durata", `${c.durata} min`]);
      if (c.interno) rows.push(["Carico interno", c.interno]);
      if (c.esterno) rows.push(["Carico esterno", c.esterno]);
      if (c.distanzaTotale) rows.push(["Distanza totale", `${c.distanzaTotale} km`]);
      if (c.velocitaMax) rows.push(["Velocità max", `${c.velocitaMax} km/h`]);
      if (c.hsr) rows.push(["HSR (>19 km/h)", `${c.hsr} m`]);
      if (c.accelerazioni) rows.push(["Accelerazioni", c.accelerazioni]);
    }
    const ws = utils.aoa_to_sheet(rows);
    utils.book_append_sheet(wb, ws, `Prog ${idx + 1}`.slice(0, 31));
  });

  writeFile(wb, `${atleta.nome.replace(/ /g, "_")}_rehab.xlsx`);
}

async function esportaPDF(atleta: Atleta, programmi: Programma[]) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  const red: [number, number, number] = [200, 16, 46];
  const dark: [number, number, number] = [43, 43, 43];

  doc.setFillColor(...red);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("USC Cremonese – Scheda Riabilitativa", 14, 14);

  doc.setTextColor(...dark);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(atleta.nome, 14, 34);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`${atleta.categoria} · ${atleta.posizione} · Piede ${atleta.piedeDominante}`, 14, 41);

  autoTable(doc, {
    startY: 48,
    head: [["Campo", "Valore"]],
    body: [
      ["Data di nascita", atleta.dataNascita ? new Date(atleta.dataNascita + "T12:00").toLocaleDateString("it-IT") : "—"],
      ["Infortunio", atleta.infortunio || "—"],
      ["Inizio riabilitazione", atleta.inizioRehab ? new Date(atleta.inizioRehab + "T12:00").toLocaleDateString("it-IT") : "—"],
      ["Fine riabilitazione", atleta.fineRehab ? new Date(atleta.fineRehab + "T12:00").toLocaleDateString("it-IT") : "—"],
      ["Fisioterapista", atleta.fisioterapista || "—"],
      ["Stato attuale", atleta.stato],
      ["Progresso recupero", `${atleta.progresso}%`],
      ["Note", atleta.note || "—"],
    ],
    headStyles: { fillColor: red, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 14, right: 14 },
  });

  programmi.forEach((prog) => {
    doc.addPage();
    doc.setFillColor(...red);
    doc.rect(0, 0, 210, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${prog.nome}${prog.fase ? ` – ${prog.fase}` : ""}`, 14, 9);
    doc.setTextColor(130, 130, 130);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(prog.data ? new Date(prog.data + "T12:00").toLocaleDateString("it-IT") : "", 14, 20);

    autoTable(doc, {
      startY: 26,
      head: [["#", "Esercizio", "Serie", "Reps/Durata", "RPE", "VAS", "Note"]],
      body: prog.esercizi.map((e, i) => [i + 1, e.nome, e.serie || "—", e.reps || "—", e.rpe ? `${e.rpe}/10` : "—", e.vas ? `${e.vas}/10` : "—", e.note || ""]),
      headStyles: { fillColor: dark, textColor: 255 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 50 } },
    });

    if (prog.tests?.length) {
      const lastY = (doc as any).lastAutoTable?.finalY ?? 120;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dark);
      doc.text("Test fisiometrici e di performance", 14, lastY + 10);
      autoTable(doc, {
        startY: lastY + 15,
        head: [["#", "Test", "Risultato", "Unità", "Note"]],
        body: prog.tests.map((t, i) => [i + 1, t.nome, t.risultato, t.unita, t.note]),
        headStyles: { fillColor: dark, textColor: 255 },
        margin: { left: 14, right: 14 },
      });
    }
  });

  doc.save(`${atleta.nome.replace(/ /g, "_")}_rehab.pdf`);
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
  const [pageTab, setPageTab] = useState<PageTab>("progressi");

  const oggi = new Date();
  const [reportAnno, setReportAnno] = useState(oggi.getFullYear());
  const [reportMese, setReportMese] = useState(oggi.getMonth());
  const [filtroCat, setFiltroCat] = useState("Tutte");
  const [filtroInf, setFiltroInf] = useState("");

  useEffect(() => {
    setAtleti(loadAtleti());
    setProgrammi(loadProgrammi());
  }, []);

  const aggiorna = (id: string, campo: keyof Atleta, valore: string | number) => {
    const nuovi = atleti.map((a) => {
      if (a.id !== id) return a;
      const updated = { ...a, [campo]: valore };
      if (campo === "stato" && valore === "Guarito" && !a.fineRehab) {
        updated.fineRehab = new Date().toISOString().slice(0, 10);
      }
      return updated;
    });
    setAtleti(nuovi);
    saveAtleti(nuovi);
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
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">
                {MESI[reportMese]} {reportAnno}
                {filtroCat !== "Tutte" && ` · ${filtroCat}`}
              </h2>
              <span className="text-sm font-bold text-[#C8102E]">{atletiMese.length} atleti</span>
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

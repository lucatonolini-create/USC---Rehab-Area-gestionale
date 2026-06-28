"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Download, FileText } from "lucide-react";
import {
  loadAtleti, loadProgrammi, saveAtleti,
  type Atleta, type Stato, type Programma,
} from "@/lib/store";

const STATI: Stato[] = ["In recupero", "Quasi guarito", "Critico", "Guarito"];
const statoColor: Record<Stato, string> = {
  "In recupero":  "bg-blue-100 text-blue-700",
  "Quasi guarito":"bg-green-100 text-green-700",
  "Critico":      "bg-red-100 text-red-700",
  "Guarito":      "bg-gray-100 text-gray-600",
};

async function esportaExcel(atleta: Atleta, programmi: Programma[]) {
  const { utils, writeFile } = await import("xlsx");
  const wb = utils.book_new();

  // Foglio info atleta
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
    ["Fisioterapista", atleta.fisioterapista],
    ["Stato attuale", atleta.stato],
    ["Progresso recupero", `${atleta.progresso}%`],
    ["Note", atleta.note],
  ];
  const wsInfo = utils.aoa_to_sheet(infoRows);
  utils.book_append_sheet(wb, wsInfo, "Atleta");

  // Fogli programmi
  programmi.forEach((prog, idx) => {
    const rows = [
      ["PROGRAMMA DI LAVORO", ""],
      ["Nome", prog.nome],
      ["Fase", prog.fase],
      ["Data", prog.data ? new Date(prog.data + "T12:00").toLocaleDateString("it-IT") : ""],
      [""],
      ["#", "Esercizio", "Serie", "Reps/Durata", "RPE (0-10)", "VAS (0-10)", "Note"],
      ...prog.esercizi.map((e, i) => [i + 1, e.nome, e.serie, e.reps, e.rpe, e.vas, e.note]),
    ];
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

  // Header
  doc.setFillColor(...red);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("USC Cremonese – Scheda Riabilitativa", 14, 14);

  // Info atleta
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
      ["Fisioterapista", atleta.fisioterapista || "—"],
      ["Stato attuale", atleta.stato],
      ["Progresso recupero", `${atleta.progresso}%`],
      ["Note", atleta.note || "—"],
    ],
    headStyles: { fillColor: red, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 14, right: 14 },
  });

  // Programmi
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
      head: [["#", "Esercizio", "Serie", "Reps/Durata", "RPE", "VAS (dolore)", "Note"]],
      body: prog.esercizi.map((e, i) => [
        i + 1, e.nome, e.serie || "—", e.reps || "—",
        e.rpe ? `${e.rpe}/10` : "—",
        e.vas ? `${e.vas}/10` : "—",
        e.note || "",
      ]),
      headStyles: { fillColor: dark, textColor: 255 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 50 } },
    });
  });

  doc.save(`${atleta.nome.replace(/ /g, "_")}_rehab.pdf`);
}

export default function ProgressiPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [programmi, setProgrammi] = useState<Programma[]>([]);
  const [esportando, setEsportando] = useState<string | null>(null);

  useEffect(() => {
    setAtleti(loadAtleti());
    setProgrammi(loadProgrammi());
  }, []);

  const aggiorna = (id: string, campo: keyof Atleta, valore: string | number) => {
    const nuovi = atleti.map((a) => (a.id === id ? { ...a, [campo]: valore } : a));
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Progressi</h1>
        <p className="text-gray-500 mt-1">Aggiorna e scarica la scheda riabilitativa</p>
      </div>

      {atleti.length === 0 ? (
        <div className="text-center py-20">
          <TrendingUp className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">Nessun atleta ancora</p>
          <p className="text-gray-300 text-sm mt-1">Aggiungi atleti nella sezione Atleti per tracciarne i progressi</p>
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

                  {/* Bottoni export */}
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleExport(atleta, "excel")}
                      disabled={!!esportando}
                      className="flex items-center gap-1.5 border border-green-300 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-50 disabled:opacity-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {esportando === atleta.id + "excel" ? "..." : "Excel"}
                    </button>
                    <button
                      onClick={() => handleExport(atleta, "pdf")}
                      disabled={!!esportando}
                      className="flex items-center gap-1.5 border border-red-200 text-[#C8102E] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {esportando === atleta.id + "pdf" ? "..." : "PDF"}
                    </button>
                  </div>
                </div>

                {/* Stato */}
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
                </div>

                {/* Progresso */}
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
      )}
    </div>
  );
}

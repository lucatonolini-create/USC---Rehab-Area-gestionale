"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, User } from "lucide-react";

const appuntamenti = [
  { id: 1, ora: "08:30", atleta: "Marco Rossi", tipo: "Fisioterapia", durata: 60, stanza: "Sala A", stato: "completato" },
  { id: 2, ora: "09:45", atleta: "Giulia Ferrari", tipo: "Recupero muscolare", durata: 45, stanza: "Sala B", stato: "completato" },
  { id: 3, ora: "11:00", atleta: "Luca Bianchi", tipo: "Valutazione", durata: 30, stanza: "Sala A", stato: "in corso" },
  { id: 4, ora: "12:00", atleta: "Sara Esposito", tipo: "Idroterapia", durata: 60, stanza: "Piscina", stato: "programmato" },
  { id: 5, ora: "14:00", atleta: "Andrea Colombo", tipo: "Rieducazione motoria", durata: 45, stanza: "Palestra", stato: "programmato" },
  { id: 6, ora: "15:00", atleta: "Elena Romano", tipo: "Fisioterapia", durata: 60, stanza: "Sala B", stato: "programmato" },
  { id: 7, ora: "16:30", atleta: "Marco Rossi", tipo: "Esercizi", durata: 45, stanza: "Palestra", stato: "programmato" },
];

const ore = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

const coloreStato: Record<string, string> = {
  completato: "bg-green-100 border-green-300 text-green-800",
  "in corso": "bg-yellow-100 border-yellow-300 text-yellow-800",
  programmato: "bg-blue-100 border-blue-300 text-blue-800",
};

export default function AppuntamentiPage() {
  const [vista, setVista] = useState<"lista" | "giornaliera">("lista");

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appuntamenti</h1>
          <p className="text-gray-500 mt-1">Sabato, 28 Giugno 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setVista("lista")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                vista === "lista" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setVista("giornaliera")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                vista === "giornaliera" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}
            >
              Vista giornaliera
            </button>
          </div>
          <button className="flex items-center gap-2 bg-[#003087] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors">
            <Plus className="w-4 h-4" />
            Nuovo
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">Oggi</h2>
        <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
        <div className="ml-auto flex gap-2">
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((g, i) => (
            <button
              key={g}
              className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                i === 5
                  ? "bg-[#003087] text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {vista === "lista" ? (
        <div className="space-y-3">
          {appuntamenti.map((app) => (
            <div key={app.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2 w-20 shrink-0">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-mono font-bold text-gray-700">{app.ora}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">{app.atleta}</span>
                  </div>
                  <p className="text-sm text-gray-500">{app.tipo} · {app.durata} min · {app.stanza}</p>
                </div>
                <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${coloreStato[app.stato]}`}>
                  {app.stato === "in corso" ? "In corso" : app.stato === "completato" ? "Completato" : "Programmato"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid" style={{ gridTemplateColumns: "80px 1fr" }}>
            {ore.map((ora) => {
              const app = appuntamenti.filter((a) => a.ora.startsWith(ora.split(":")[0]));
              return (
                <div key={ora} className="contents">
                  <div className="border-b border-r border-gray-100 p-3 text-xs text-gray-400 font-mono">
                    {ora}
                  </div>
                  <div className="border-b border-gray-100 p-2 min-h-[60px]">
                    {app.map((a) => (
                      <div
                        key={a.id}
                        className={`text-xs p-2 rounded-lg border mb-1 ${coloreStato[a.stato]}`}
                      >
                        <span className="font-semibold">{a.atleta}</span> — {a.tipo}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

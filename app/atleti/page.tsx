"use client";

import { useState } from "react";
import { Search, Plus, Phone, Mail, ChevronRight, User } from "lucide-react";

const atleti = [
  {
    id: 1,
    nome: "Marco Rossi",
    eta: 24,
    posizione: "Centrocampista",
    infortunio: "Rottura legamento crociato anteriore",
    inizioRehab: "2026-05-17",
    stato: "In recupero",
    progresso: 75,
    fisioterapista: "Dott. Conti",
    telefono: "+39 333 1234567",
    email: "m.rossi@usc.it",
  },
  {
    id: 2,
    nome: "Giulia Ferrari",
    eta: 21,
    posizione: "Attaccante",
    infortunio: "Lesione al bicipite femorale",
    inizioRehab: "2026-06-10",
    stato: "In recupero",
    progresso: 60,
    fisioterapista: "Dott.ssa Mori",
    telefono: "+39 347 9876543",
    email: "g.ferrari@usc.it",
  },
  {
    id: 3,
    nome: "Luca Bianchi",
    eta: 28,
    posizione: "Difensore",
    infortunio: "Distorsione alla caviglia destra",
    inizioRehab: "2026-05-29",
    stato: "Quasi guarito",
    progresso: 90,
    fisioterapista: "Dott. Conti",
    telefono: "+39 328 5551234",
    email: "l.bianchi@usc.it",
  },
  {
    id: 4,
    nome: "Sara Esposito",
    eta: 19,
    posizione: "Portiere",
    infortunio: "Frattura tibia sinistra",
    inizioRehab: "2026-04-24",
    stato: "Critico",
    progresso: 40,
    fisioterapista: "Dott.ssa Mori",
    telefono: "+39 320 7778888",
    email: "s.esposito@usc.it",
  },
  {
    id: 5,
    nome: "Andrea Colombo",
    eta: 26,
    posizione: "Ala sinistra",
    infortunio: "Tendinite al ginocchio",
    inizioRehab: "2026-06-15",
    stato: "In recupero",
    progresso: 55,
    fisioterapista: "Dott. Conti",
    telefono: "+39 339 4445556",
    email: "a.colombo@usc.it",
  },
  {
    id: 6,
    nome: "Elena Romano",
    eta: 23,
    posizione: "Terzino",
    infortunio: "Stiramento muscolare",
    inizioRehab: "2026-06-20",
    stato: "In recupero",
    progresso: 30,
    fisioterapista: "Dott.ssa Mori",
    telefono: "+39 346 2223334",
    email: "e.romano@usc.it",
  },
];

const statoColor: Record<string, string> = {
  "In recupero": "bg-blue-100 text-blue-700",
  "Quasi guarito": "bg-green-100 text-green-700",
  "Critico": "bg-red-100 text-red-700",
};

export default function AletiPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<(typeof atleti)[0] | null>(null);

  const filtered = atleti.filter(
    (a) =>
      a.nome.toLowerCase().includes(search.toLowerCase()) ||
      a.infortunio.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Atleti</h1>
            <p className="text-gray-500 mt-1">{atleti.length} atleti nel programma di riabilitazione</p>
          </div>
          <button className="flex items-center gap-2 bg-[#003087] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors">
            <Plus className="w-4 h-4" />
            Nuovo Atleta
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nome o infortunio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] focus:border-transparent"
          />
        </div>

        <div className="space-y-3">
          {filtered.map((atleta) => (
            <div
              key={atleta.id}
              onClick={() => setSelected(atleta)}
              className={`bg-white rounded-xl p-5 border cursor-pointer transition-all hover:shadow-md ${
                selected?.id === atleta.id ? "border-[#003087] shadow-md" : "border-gray-100"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#003087] rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {atleta.nome.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-semibold text-gray-900">{atleta.nome}</p>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statoColor[atleta.stato]}`}>
                      {atleta.stato}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{atleta.infortunio}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-[#003087]">{atleta.progresso}%</p>
                  <p className="text-xs text-gray-400">recupero</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    atleta.progresso >= 80
                      ? "bg-green-500"
                      : atleta.progresso >= 50
                      ? "bg-[#FFCC00]"
                      : "bg-orange-500"
                  }`}
                  style={{ width: `${atleta.progresso}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 bg-white border-l border-gray-100 p-6 overflow-y-auto">
          <button
            onClick={() => setSelected(null)}
            className="text-gray-400 hover:text-gray-600 mb-6 text-sm"
          >
            ✕ Chiudi
          </button>

          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-[#003087] rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
              {selected.nome.split(" ").map((n) => n[0]).join("")}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{selected.nome}</h2>
            <p className="text-gray-500 text-sm">{selected.posizione} · {selected.eta} anni</p>
            <span className={`text-xs px-3 py-1 rounded-full font-medium mt-2 inline-block ${statoColor[selected.stato]}`}>
              {selected.stato}
            </span>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Infortunio</p>
              <p className="text-sm font-medium text-gray-900">{selected.infortunio}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Progresso recupero</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#003087] rounded-full"
                    style={{ width: `${selected.progresso}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-[#003087]">{selected.progresso}%</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fisioterapista</p>
              <p className="text-sm font-medium text-gray-900">{selected.fisioterapista}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Contatti</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {selected.telefono}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {selected.email}
                </div>
              </div>
            </div>
          </div>

          <button className="w-full mt-6 bg-[#003087] text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors">
            Vedi scheda completa
          </button>
        </div>
      )}
    </div>
  );
}

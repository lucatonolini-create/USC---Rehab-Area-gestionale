"use client";

import { useState } from "react";
import { Plus, Dumbbell, Clock, BarChart, ChevronDown } from "lucide-react";

const programmi = [
  {
    id: 1,
    nome: "Recupero LCA - Fase 1",
    atleta: "Marco Rossi",
    fase: "Fase 1 – Controllo del dolore",
    settimane: 6,
    settimanaCorrente: 4,
    esercizi: [
      { nome: "Stretching quadricipite", serie: 3, reps: "30 sec", intensita: "Bassa" },
      { nome: "Leg press isometrico", serie: 3, reps: "10", intensita: "Bassa" },
      { nome: "Elettrostimolazione", serie: 1, reps: "20 min", intensita: "Bassa" },
      { nome: "Ghiaccio / crioterapia", serie: 1, reps: "15 min", intensita: "" },
    ],
  },
  {
    id: 2,
    nome: "Lesione bicipite femorale",
    atleta: "Giulia Ferrari",
    fase: "Fase 2 – Recupero forza",
    settimane: 4,
    settimanaCorrente: 2,
    esercizi: [
      { nome: "Curl femorali", serie: 3, reps: "12", intensita: "Media" },
      { nome: "Nordic hamstring", serie: 2, reps: "8", intensita: "Alta" },
      { nome: "Cyclette", serie: 1, reps: "20 min", intensita: "Media" },
      { nome: "Foam rolling", serie: 1, reps: "10 min", intensita: "" },
    ],
  },
  {
    id: 3,
    nome: "Recupero distorsione caviglia",
    atleta: "Luca Bianchi",
    fase: "Fase 3 – Ritorno al campo",
    settimane: 3,
    settimanaCorrente: 3,
    esercizi: [
      { nome: "Propriocezione su tavoletta", serie: 4, reps: "1 min", intensita: "Media" },
      { nome: "Corsa in linea retta", serie: 1, reps: "15 min", intensita: "Media" },
      { nome: "Cambi di direzione", serie: 3, reps: "5", intensita: "Alta" },
      { nome: "Pallone – passaggi", serie: 1, reps: "20 min", intensita: "Media" },
    ],
  },
];

const intensitaColor: Record<string, string> = {
  "Bassa": "bg-green-100 text-green-700",
  "Media": "bg-yellow-100 text-yellow-700",
  "Alta": "bg-red-100 text-red-700",
  "": "bg-gray-100 text-gray-500",
};

export default function EserciziPage() {
  const [aperto, setAperto] = useState<number | null>(1);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Programmi di Esercizi</h1>
          <p className="text-gray-500 mt-1">{programmi.length} programmi attivi</p>
        </div>
        <button className="flex items-center gap-2 bg-[#003087] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors">
          <Plus className="w-4 h-4" />
          Nuovo programma
        </button>
      </div>

      <div className="space-y-4">
        {programmi.map((prog) => (
          <div key={prog.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <button
              onClick={() => setAperto(aperto === prog.id ? null : prog.id)}
              className="w-full flex items-center gap-5 p-6 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-12 h-12 bg-[#003087] rounded-xl flex items-center justify-center shrink-0">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900">{prog.nome}</h3>
                  <span className="text-xs bg-[#FFCC00] text-[#003087] px-2.5 py-0.5 rounded-full font-medium">
                    {prog.fase}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{prog.atleta}</p>
              </div>
              <div className="text-right mr-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <BarChart className="w-4 h-4" />
                  Settimana {prog.settimanaCorrente}/{prog.settimane}
                </div>
                <div className="h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#003087] rounded-full"
                    style={{ width: `${(prog.settimanaCorrente / prog.settimane) * 100}%` }}
                  />
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform ${aperto === prog.id ? "rotate-180" : ""}`}
              />
            </button>

            {aperto === prog.id && (
              <div className="border-t border-gray-100 p-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  Esercizi della settimana
                </h4>
                <div className="space-y-3">
                  {prog.esercizi.map((es, i) => (
                    <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-xl px-5 py-3.5">
                      <span className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{es.nome}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {es.serie > 0 && (
                          <span>{es.serie} serie × {es.reps}</span>
                        )}
                        {es.intensita && (
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${intensitaColor[es.intensita]}`}>
                            {es.intensita}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-3">
                  <button className="flex-1 border border-[#003087] text-[#003087] py-2.5 rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors">
                    Modifica programma
                  </button>
                  <button className="flex-1 bg-[#003087] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors">
                    Registra seduta
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

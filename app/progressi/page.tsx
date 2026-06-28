"use client";

import { useEffect, useState } from "react";
import { TrendingUp, User } from "lucide-react";
import { loadAtleti, saveAtleti, type Atleta, type Stato } from "@/lib/store";

const STATI: Stato[] = ["In recupero", "Quasi guarito", "Critico", "Guarito"];

const statoColor: Record<Stato, string> = {
  "In recupero": "bg-blue-100 text-blue-700",
  "Quasi guarito": "bg-green-100 text-green-700",
  "Critico": "bg-red-100 text-red-700",
  "Guarito": "bg-gray-100 text-gray-600",
};

export default function ProgressiPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);

  useEffect(() => {
    setAtleti(loadAtleti());
  }, []);

  const aggiorna = (id: string, campo: keyof Atleta, valore: string | number) => {
    const nuovi = atleti.map((a) => (a.id === id ? { ...a, [campo]: valore } : a));
    setAtleti(nuovi);
    saveAtleti(nuovi);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Progressi</h1>
        <p className="text-gray-500 mt-1">Aggiorna il recupero di ogni atleta</p>
      </div>

      {atleti.length === 0 ? (
        <div className="text-center py-20">
          <TrendingUp className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">Nessun atleta ancora</p>
          <p className="text-gray-300 text-sm mt-1">Aggiungi atleti nella sezione Atleti per tracciarne i progressi</p>
        </div>
      ) : (
        <div className="space-y-4">
          {atleti.map((atleta) => (
            <div key={atleta.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 bg-[#C8102E] rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {atleta.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{atleta.nome}</h3>
                  <p className="text-sm text-gray-500">{atleta.infortunio || "Nessun infortunio specificato"}</p>
                </div>
                <select
                  value={atleta.stato}
                  onChange={(e) => aggiorna(atleta.id, "stato", e.target.value)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium border-0 cursor-pointer ${statoColor[atleta.stato]}`}
                >
                  {STATI.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-600">Progresso recupero</label>
                  <span className="text-2xl font-bold text-[#C8102E]">{atleta.progresso}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={atleta.progresso}
                  onChange={(e) => aggiorna(atleta.id, "progresso", Number(e.target.value))}
                  className="w-full accent-[#C8102E] h-2"
                />
                <div className="flex justify-between text-xs text-gray-300 mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              {atleta.note && (
                <div className="mt-4 bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Note</p>
                  <p className="text-sm text-gray-700">{atleta.note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

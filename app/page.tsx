"use client";

import { useEffect, useState } from "react";
import { Users, Activity, TrendingUp, Dumbbell, User } from "lucide-react";
import { loadAtleti, loadProgrammi, type Atleta, type Programma, CATEGORIE } from "@/lib/store";
import Link from "next/link";

export default function Dashboard() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [programmi, setProgrammi] = useState<Programma[]>([]);

  useEffect(() => {
    setAtleti(loadAtleti());
    setProgrammi(loadProgrammi());
  }, []);

  const inRecupero = atleti.filter((a) => a.stato === "In recupero" || a.stato === "Critico").length;
  const guariti = atleti.filter((a) => a.stato === "Guarito").length;

  const stats = [
    { label: "Atleti Totali", value: atleti.length, icon: Users, color: "bg-[#2B2B2B]" },
    { label: "In Recupero", value: inRecupero, icon: Activity, color: "bg-orange-500" },
    { label: "Guariti", value: guariti, icon: TrendingUp, color: "bg-green-500" },
    { label: "Programmi Attivi", value: programmi.length, icon: Dumbbell, color: "bg-[#C8102E]" },
  ];

  // Ultimi 5 atleti per stato critico / in recupero
  const inEvidenza = atleti
    .filter((a) => a.stato !== "Guarito")
    .slice(0, 6);

  // Distribuzione per categoria
  const perCat = CATEGORIE.map((c) => ({
    cat: c,
    count: atleti.filter((a) => a.categoria === c).length,
  })).filter((x) => x.count > 0);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                  <p className="text-4xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-2.5 rounded-xl`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Atleti in evidenza */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Atleti in Recupero</h2>
            <Link href="/atleti" className="text-xs text-[#C8102E] font-medium hover:underline">Vedi tutti</Link>
          </div>
          {inEvidenza.length === 0 ? (
            <div className="p-10 text-center">
              <User className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Nessun atleta ancora</p>
              <Link href="/atleti" className="text-[#C8102E] text-sm font-medium mt-2 inline-block hover:underline">
                + Aggiungi atleta
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {inEvidenza.map((atleta) => (
                <div key={atleta.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-9 h-9 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {atleta.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{atleta.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{atleta.categoria}{atleta.infortunio ? ` · ${atleta.infortunio}` : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-[#C8102E]">{atleta.progresso}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distribuzione per categoria */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Distribuzione per Categoria</h2>
          </div>
          {perCat.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-400 text-sm">Nessun dato disponibile</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {perCat.map(({ cat, count }) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{cat}</span>
                    <span className="text-sm font-bold text-[#C8102E]">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C8102E] rounded-full transition-all"
                      style={{ width: `${(count / atleti.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

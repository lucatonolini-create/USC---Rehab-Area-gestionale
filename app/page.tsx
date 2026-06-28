"use client";

import { useEffect, useState } from "react";
import { Users, Calendar, Activity, TrendingUp, Clock, User } from "lucide-react";
import { loadAtleti, loadAppuntamenti, type Atleta, type Appuntamento } from "@/lib/store";
import Link from "next/link";

export default function Dashboard() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);

  useEffect(() => {
    setAtleti(loadAtleti());
    setAppuntamenti(loadAppuntamenti());
  }, []);

  const oggi = new Date().toISOString().slice(0, 10);
  const appOggi = appuntamenti
    .filter((a) => a.data === oggi)
    .sort((a, b) => a.ora.localeCompare(b.ora));

  const inRecupero = atleti.filter((a) => a.stato === "In recupero" || a.stato === "Critico").length;
  const guariti = atleti.filter((a) => a.stato === "Guarito").length;

  const stats = [
    { label: "Atleti Attivi", value: atleti.length, icon: Users, color: "bg-blue-500" },
    { label: "Sedute Oggi", value: appOggi.length, icon: Calendar, color: "bg-green-500" },
    { label: "In Recupero", value: inRecupero, icon: Activity, color: "bg-orange-500" },
    { label: "Guarigioni", value: guariti, icon: TrendingUp, color: "bg-purple-500" },
  ];

  const statoColor: Record<string, string> = {
    completato: "bg-green-100 text-green-700",
    "in corso": "bg-yellow-100 text-yellow-700",
    programmato: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Benvenuto nel gestionale USC Rehab Area —{" "}
          {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                  <p className="text-4xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Appuntamenti oggi */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Appuntamenti di Oggi</h2>
            <Link href="/appuntamenti" className="text-sm text-[#003087] font-medium hover:underline">
              Vedi tutti
            </Link>
          </div>
          {appOggi.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Nessun appuntamento oggi</p>
              <Link href="/appuntamenti" className="text-[#003087] text-sm font-medium mt-2 inline-block hover:underline">
                + Aggiungi appuntamento
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {appOggi.map((app) => {
                const atleta = atleti.find((a) => a.id === app.atletaId);
                return (
                  <div key={app.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex items-center gap-2 w-16 shrink-0">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-mono font-medium text-gray-700">{app.ora}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{atleta?.nome ?? "—"}</p>
                      <p className="text-xs text-gray-500">{app.tipo}</p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${statoColor[app.stato]}`}>
                      {app.stato === "in corso" ? "In corso" : app.stato === "completato" ? "Completato" : "Programmato"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Atleti in recupero */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Atleti in Recupero</h2>
            <Link href="/atleti" className="text-sm text-[#003087] font-medium hover:underline">
              Vedi tutti
            </Link>
          </div>
          {atleti.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Nessun atleta ancora</p>
              <Link href="/atleti" className="text-[#003087] text-sm font-medium mt-2 inline-block hover:underline">
                + Aggiungi atleta
              </Link>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {atleti.filter((a) => a.stato !== "Guarito").slice(0, 4).map((atleta) => (
                <div key={atleta.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{atleta.nome}</p>
                      <p className="text-xs text-gray-500">{atleta.infortunio || "—"}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{atleta.progresso}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        atleta.progresso >= 80 ? "bg-green-500" : atleta.progresso >= 50 ? "bg-yellow-400" : "bg-orange-500"
                      }`}
                      style={{ width: `${atleta.progresso}%` }}
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

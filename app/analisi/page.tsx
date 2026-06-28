"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart2, Users, Activity, TrendingUp, Calendar } from "lucide-react";
import { loadAtleti, loadProgrammi, CATEGORIE, type Atleta, type Programma } from "@/lib/store";

const MESI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

function BarraOrizzontale({ label, value, max, color = "bg-[#C8102E]", sub }: {
  label: string; value: number; max: number; color?: string; sub?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-24 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
          style={{ width: `${Math.max(pct, value > 0 ? 8 : 0)}%` }}>
          {value > 0 && <span className="text-xs text-white font-bold">{value}</span>}
        </div>
      </div>
      {sub && <span className="text-xs text-gray-400 w-16 shrink-0 text-right">{sub}</span>}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number | string; sub?: string; icon: any; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`${color} p-2.5 rounded-xl`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

type AnalisiTab = "overview" | "report";

const MESI_LUNGHI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

function atletaAttivoInMese(a: Atleta, anno: number, mese: number): boolean {
  if (!a.inizioRehab) return false;
  const inizio = new Date(a.inizioRehab + "T12:00");
  const meseStart = new Date(anno, mese, 1);
  const meseEnd = new Date(anno, mese + 1, 0);
  if (inizio > meseEnd) return false;
  if (a.stato === "Guarito") {
    if (a.fineRehab) return new Date(a.fineRehab + "T12:00") >= meseStart;
    return inizio >= meseStart;
  }
  return true;
}

export default function AnalisiPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [programmi, setProgrammi] = useState<Programma[]>([]);
  const [tab, setTab] = useState<AnalisiTab>("overview");

  const oggi = new Date();
  const [reportAnno, setReportAnno] = useState(oggi.getFullYear());
  const [reportMese, setReportMese] = useState(oggi.getMonth());
  const [filtroCat, setFiltroCat] = useState("Tutte");
  const [filtroInf, setFiltroInf] = useState("");

  useEffect(() => {
    setAtleti(loadAtleti());
    setProgrammi(loadProgrammi());
  }, []);

  const attivi = atleti.filter((a) => a.stato !== "Guarito");
  const guariti = atleti.filter((a) => a.stato === "Guarito");

  // Per categoria (tutti atleti)
  const perCategoria = useMemo(() => {
    return CATEGORIE.map((cat) => ({
      cat,
      totale: atleti.filter((a) => a.categoria === cat).length,
      attivi: atleti.filter((a) => a.categoria === cat && a.stato !== "Guarito").length,
    })).filter((x) => x.totale > 0);
  }, [atleti]);

  // Per tipologia infortunio (top 8 tra attivi)
  const perInfortunio = useMemo(() => {
    const map: Record<string, number> = {};
    atleti.forEach((a) => {
      if (!a.infortunio) return;
      const key = a.infortunio.trim();
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([nome, count]) => ({ nome, count }));
  }, [atleti]);

  // Trend mensile (ultimi 12 mesi)
  const trendMensile = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(oggi.getFullYear(), oggi.getMonth() - 11 + i, 1);
      const anno = d.getFullYear();
      const mese = d.getMonth();
      const count = atleti.filter((a) => atletaAttivoInMese(a, anno, mese)).length;
      return { label: `${MESI[mese]} ${anno !== oggi.getFullYear() ? anno : ""}`.trim(), count };
    });
  }, [atleti]);

  const maxTrend = Math.max(...trendMensile.map((t) => t.count), 1);
  const maxCat = Math.max(...perCategoria.map((x) => x.totale), 1);
  const maxInf = Math.max(...perInfortunio.map((x) => x.count), 1);

  // Report mensile
  const anni = Array.from({ length: 5 }, (_, i) => oggi.getFullYear() - 2 + i);
  const atletiMese = atleti.filter((a) => {
    if (!atletaAttivoInMese(a, reportAnno, reportMese)) return false;
    if (filtroCat !== "Tutte" && a.categoria !== filtroCat) return false;
    if (filtroInf && !(a.infortunio ?? "").toLowerCase().includes(filtroInf.toLowerCase())) return false;
    return true;
  });

  const statoColor: Record<string, string> = {
    "In recupero": "bg-blue-100 text-blue-700",
    "Quasi guarito": "bg-green-100 text-green-700",
    "Guarito": "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analisi</h1>
          <p className="text-gray-500 mt-1">Statistiche e report infortuni</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(["overview", "report"] as AnalisiTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              {t === "overview" ? "Panoramica" : "Report mensile"}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" ? (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Atleti totali" value={atleti.length} sub="in gestione" icon={Users} color="bg-[#2B2B2B]" />
            <StatCard label="In riabilitazione" value={attivi.length} sub="attualmente attivi" icon={Activity} color="bg-orange-500" />
            <StatCard label="Guariti" value={guariti.length} sub="completato percorso" icon={TrendingUp} color="bg-green-500" />
            <StatCard label="Programmi totali" value={programmi.length} sub="sessioni create" icon={BarChart2} color="bg-[#C8102E]" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Atleti per categoria */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-1">Atleti per categoria</h2>
              <p className="text-xs text-gray-400 mb-5">Totale iscritti e in riabilitazione attiva</p>
              {perCategoria.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Nessun atleta ancora</p>
              ) : (
                <div className="space-y-3">
                  {perCategoria.map(({ cat, totale, attivi: a }) => (
                    <div key={cat}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span className="font-semibold">{cat}</span>
                        <span>{a} attivi / {totale} totali</span>
                      </div>
                      <div className="h-5 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-[#C8102E] rounded-full transition-all duration-500"
                          style={{ width: `${(a / maxCat) * 100}%` }} />
                        <div className="h-full bg-gray-200 rounded-full transition-all duration-500"
                          style={{ width: `${((totale - a) / maxCat) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 pt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#C8102E] inline-block" />In riabilitazione</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />Guariti</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tipologie infortunio */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-1">Tipologie di infortunio</h2>
              <p className="text-xs text-gray-400 mb-5">Infortuni più frequenti (tutti gli atleti)</p>
              {perInfortunio.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Nessun dato disponibile</p>
              ) : (
                <div className="space-y-3">
                  {perInfortunio.map(({ nome, count }) => (
                    <BarraOrizzontale key={nome} label={nome} value={count} max={maxInf}
                      sub={count === 1 ? "1 atleta" : `${count} atleti`} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trend mensile */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-1">Atleti in riabilitazione – ultimi 12 mesi</h2>
            <p className="text-xs text-gray-400 mb-5">Numero di atleti attivi per ogni mese del periodo</p>
            {atleti.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Nessun dato disponibile</p>
            ) : (
              <div className="flex items-end gap-2 h-40 pt-4">
                {trendMensile.map(({ label, count }) => {
                  const h = maxTrend > 0 ? Math.max((count / maxTrend) * 100, count > 0 ? 8 : 0) : 0;
                  const isOggi = label.startsWith(MESI[oggi.getMonth()]) && !label.includes(String(oggi.getFullYear() - 1));
                  return (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-gray-600">{count > 0 ? count : ""}</span>
                      <div className="w-full flex items-end" style={{ height: "80px" }}>
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${isOggi ? "bg-[#C8102E]" : "bg-gray-200"}`}
                          style={{ height: `${h}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 text-center leading-tight">{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Progressi medi per categoria */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-1">Progresso medio di recupero per categoria</h2>
            <p className="text-xs text-gray-400 mb-5">Calcolato sugli atleti attualmente in riabilitazione</p>
            {attivi.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Nessun atleta attivo</p>
            ) : (
              <div className="space-y-3">
                {CATEGORIE.map((cat) => {
                  const lista = attivi.filter((a) => a.categoria === cat);
                  if (!lista.length) return null;
                  const media = Math.round(lista.reduce((s, a) => s + a.progresso, 0) / lista.length);
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span className="font-semibold">{cat}</span>
                        <span className="font-bold text-[#C8102E]">{media}%</span>
                      </div>
                      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${
                          media >= 75 ? "bg-green-500" : media >= 40 ? "bg-yellow-400" : "bg-orange-500"
                        }`} style={{ width: `${media}%` }} />
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Report mensile */
        <div className="space-y-5">
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
                  {MESI_LUNGHI.map((m, i) => <option key={m} value={i}>{m}</option>)}
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

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {CATEGORIE.map((cat) => {
              const n = atletiMese.filter((a) => a.categoria === cat).length;
              if (!n) return null;
              return (
                <div key={cat} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
                  <p className="text-xs font-bold text-[#C8102E] uppercase tracking-widest">{cat}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{n}</p>
                  <p className="text-xs text-gray-400">atleti</p>
                </div>
              );
            })}
          </div>

          {/* Tabella atleti */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">
                {MESI_LUNGHI[reportMese]} {reportAnno}
                {filtroCat !== "Tutte" && ` · ${filtroCat}`}
              </h2>
              <span className="text-sm font-bold text-[#C8102E]">{atletiMese.length} atleti</span>
            </div>

            {atletiMese.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nessun atleta attivo in questo periodo</p>
              </div>
            ) : (
              <>
                <div className="hidden md:grid grid-cols-5 px-5 py-2 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <span className="col-span-2">Atleta</span>
                  <span>Infortunio</span>
                  <span className="text-center">Stato</span>
                  <span className="text-right">Progresso</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {atletiMese.map((a) => (
                    <div key={a.id} className="grid grid-cols-1 md:grid-cols-5 items-center px-5 py-4 hover:bg-gray-50 gap-2">
                      <div className="col-span-2 flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {a.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{a.nome}</p>
                          <p className="text-xs text-gray-400">{a.categoria}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{a.infortunio || "—"}</p>
                      <div className="flex md:justify-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statoColor[a.stato]}`}>
                          {a.stato}
                        </span>
                      </div>
                      <div className="md:text-right">
                        <span className="text-lg font-bold text-[#C8102E]">{a.progresso}%</span>
                        <p className="text-xs text-gray-400">
                          {a.inizioRehab ? new Date(a.inizioRehab + "T12:00").toLocaleDateString("it-IT") : "—"}
                          {a.fineRehab ? ` → ${new Date(a.fineRehab + "T12:00").toLocaleDateString("it-IT")}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

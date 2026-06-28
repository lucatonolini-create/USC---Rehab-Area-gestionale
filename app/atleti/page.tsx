"use client";

import { useEffect, useState } from "react";
import { Plus, Search, User, ChevronRight, Phone, Mail, Trash2 } from "lucide-react";
import {
  loadAtleti, upsertAtleta, deleteAtleta, uid,
  CATEGORIE, calcolaPHV, type Atleta, type Stato,
} from "@/lib/store";
import AtletaModal from "@/components/AtletaModal";
import CartellaClinaca from "@/components/CartellaClinaca";

const statoColor: Record<Stato, string> = {
  "In recupero":  "bg-blue-100 text-blue-700",
  "Quasi guarito":"bg-green-100 text-green-700",
  "Guarito":      "bg-gray-100 text-gray-600",
};

const FILTRI_STATO: { label: string; value: Stato | "Tutti" }[] = [
  { label: "Tutti", value: "Tutti" },
  { label: "In recupero", value: "In recupero" },
  { label: "Quasi guarito", value: "Quasi guarito" },
  { label: "Guarito", value: "Guarito" },
];

type Tab = "dati" | "cartella";

export default function AtletiPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [search, setSearch] = useState("");
  const [filtroStato, setFiltroStato] = useState<Stato | "Tutti">("Tutti");
  const [selected, setSelected] = useState<Atleta | null>(null);
  const [tab, setTab] = useState<Tab>("dati");
  const [mostraForm, setMostraForm] = useState(false);
  const [editAtleta, setEditAtleta] = useState<Atleta | undefined>(undefined);

  useEffect(() => { loadAtleti().then(setAtleti); }, []);

  const apriNuovo = () => { setEditAtleta(undefined); setMostraForm(true); setSelected(null); };
  const apriModifica = (a: Atleta) => { setEditAtleta(a); setMostraForm(true); };

  const onSalvaAtleta = async (dati: Omit<Atleta, "id">) => {
    if (editAtleta) {
      const aggiornato = { ...dati, id: editAtleta.id };
      setAtleti((prev) => prev.map((a) => a.id === editAtleta.id ? aggiornato : a));
      setSelected(aggiornato);
      await upsertAtleta(aggiornato);
    } else {
      const nuovo = { ...dati, id: uid() };
      setAtleti((prev) => [...prev, nuovo]);
      await upsertAtleta(nuovo);
    }
    setMostraForm(false);
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
                          atleta.stato === "Guarito" ? "bg-gray-400" : "bg-[#2B2B2B]"
                        }`}>
                          {atleta.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className={`font-semibold ${atleta.stato === "Guarito" ? "text-gray-500" : "text-gray-900"}`}>{atleta.nome}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statoColor[atleta.stato]}`}>
                              {atleta.stato}
                            </span>
                            {atleta.tipoInfortunio && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                                {atleta.tipoInfortunio}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 truncate">
                            {atleta.posizione}{atleta.infortunio ? ` · ${atleta.infortunio}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xl font-bold ${atleta.stato === "Guarito" ? "text-green-500" : "text-[#C8102E]"}`}>
                            {atleta.progresso}%
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                      {atleta.infortunio && atleta.stato !== "Guarito" && (
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
                selected.stato === "Guarito" ? "bg-gray-400" : "bg-[#2B2B2B]"
              }`}>
                {selected.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <h2 className="font-bold text-gray-900 text-lg">{selected.nome}</h2>
              <p className="text-sm text-gray-500">{selected.posizione} · {selected.categoria}</p>
              <span className={`text-xs px-3 py-1 rounded-full font-medium mt-1 inline-block ${statoColor[selected.stato]}`}>
                {selected.stato}
              </span>
            </div>

            <div className="flex mt-4 bg-gray-100 rounded-xl p-1">
              {(["dati", "cartella"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                  }`}>
                  {t === "dati" ? "Dati personali" : "Cartella clinica"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {tab === "dati" ? (
              <div className="space-y-2.5 text-sm">
                {selected.tipoInfortunio && (
                  <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                    <p className="text-xs text-purple-500">Tipo infortunio</p>
                    <p className="font-semibold text-purple-900">{selected.tipoInfortunio}</p>
                  </div>
                )}
                {[
                  ["Data di nascita", selected.dataNascita ? new Date(selected.dataNascita + "T12:00").toLocaleDateString("it-IT") : "—"],
                  ["Piede dominante", selected.piedeDominante || "—"],
                  ["Diagnosi / Infortunio", selected.infortunio || "—"],
                  ["Inizio riabilitazione", selected.inizioRehab ? new Date(selected.inizioRehab + "T12:00").toLocaleDateString("it-IT") : "—"],
                  ...(selected.fineRehab ? [["Fine riabilitazione", new Date(selected.fineRehab + "T12:00").toLocaleDateString("it-IT")]] : []),
                  ["Fisioterapista", selected.fisioterapista || "—"],
                  ["Preparatore atletico", selected.preparatoreAtletico || "—"],
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
            ) : (
              <CartellaClinaca atletaId={selected.id} />
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

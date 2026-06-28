"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Trash2, User, ChevronRight, Phone, Mail } from "lucide-react";
import {
  loadAtleti, saveAtleti, uid,
  CATEGORIE, type Atleta, type Stato,
} from "@/lib/store";
import AtletaModal from "@/components/AtletaModal";
import CartellaClinaca from "@/components/CartellaClinaca";
import dynamic from "next/dynamic";

const statoColor: Record<Stato, string> = {
  "In recupero":  "bg-blue-100 text-blue-700",
  "Quasi guarito":"bg-green-100 text-green-700",
  "Critico":      "bg-red-100 text-red-700",
  "Guarito":      "bg-gray-100 text-gray-600",
};

type Tab = "dati" | "cartella";

export default function AtletiPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Atleta | null>(null);
  const [tab, setTab] = useState<Tab>("dati");
  const [mostraForm, setMostraForm] = useState(false);
  const [editAtleta, setEditAtleta] = useState<Atleta | undefined>(undefined);

  useEffect(() => { setAtleti(loadAtleti()); }, []);

  const salva = (nuovi: Atleta[]) => { setAtleti(nuovi); saveAtleti(nuovi); };

  const apriNuovo = () => { setEditAtleta(undefined); setMostraForm(true); setSelected(null); };
  const apriModifica = (a: Atleta) => { setEditAtleta(a); setMostraForm(true); };

  const onSalvaAtleta = (dati: Omit<Atleta, "id">) => {
    if (editAtleta) {
      const nuovi = atleti.map((a) => a.id === editAtleta.id ? { ...dati, id: editAtleta.id } : a);
      salva(nuovi);
      setSelected(nuovi.find((a) => a.id === editAtleta.id) ?? null);
    } else {
      const nuovo = { ...dati, id: uid() };
      salva([...atleti, nuovo]);
    }
    setMostraForm(false);
  };

  const elimina = (id: string) => {
    salva(atleti.filter((a) => a.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const filtered = atleti.filter(
    (a) => a.nome.toLowerCase().includes(search.toLowerCase()) ||
           (a.infortunio ?? "").toLowerCase().includes(search.toLowerCase()) ||
           a.categoria.toLowerCase().includes(search.toLowerCase())
  );

  const perCategoria: Record<string, Atleta[]> = {};
  CATEGORIE.forEach((cat) => {
    const lista = filtered.filter((a) => a.categoria === cat);
    if (lista.length > 0) perCategoria[cat] = lista;
  });

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

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Cerca per nome, infortunio o categoria..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <User className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">Nessun atleta ancora</p>
            <p className="text-gray-300 text-sm mt-1">Clicca "Nuovo Atleta" per aggiungerne uno</p>
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
                    <button key={atleta.id} onClick={() => { setSelected(atleta); setTab("dati"); }}
                      className={`w-full bg-white rounded-xl p-4 border text-left transition-all hover:shadow-md ${
                        selected?.id === atleta.id ? "border-[#C8102E] shadow-md" : "border-gray-100"
                      }`}>
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white font-bold shrink-0">
                          {atleta.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="font-semibold text-gray-900">{atleta.nome}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statoColor[atleta.stato]}`}>
                              {atleta.stato}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 truncate">
                            {atleta.posizione}{atleta.piedeDominante ? ` · Piede ${atleta.piedeDominante}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-[#C8102E]">{atleta.progresso}%</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                      {atleta.infortunio && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${
                              atleta.progresso >= 80 ? "bg-green-500" : atleta.progresso >= 50 ? "bg-yellow-400" : "bg-orange-500"
                            }`} style={{ width: `${atleta.progresso}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{atleta.infortunio}</p>
                        </div>
                      )}
                    </button>
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
          {/* Header atleta */}
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
              <div className="w-16 h-16 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">
                {selected.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <h2 className="font-bold text-gray-900 text-lg">{selected.nome}</h2>
              <p className="text-sm text-gray-500">{selected.posizione} · {selected.categoria}</p>
              <span className={`text-xs px-3 py-1 rounded-full font-medium mt-1 inline-block ${statoColor[selected.stato]}`}>
                {selected.stato}
              </span>
            </div>

            {/* Tab switcher */}
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

          {/* Contenuto tab */}
          <div className="flex-1 overflow-y-auto p-5">
            {tab === "dati" ? (
              <div className="space-y-2.5 text-sm">
                {[
                  ["Data di nascita", selected.dataNascita ? new Date(selected.dataNascita + "T12:00").toLocaleDateString("it-IT") : "—"],
                  ["Piede dominante", selected.piedeDominante || "—"],
                  ["Infortunio", selected.infortunio || "—"],
                  ["Inizio riabilitazione", selected.inizioRehab ? new Date(selected.inizioRehab + "T12:00").toLocaleDateString("it-IT") : "—"],
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

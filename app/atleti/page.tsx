"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Trash2, Edit2, X, User, ChevronRight } from "lucide-react";
import {
  loadAtleti,
  saveAtleti,
  uid,
  type Atleta,
  type Stato,
} from "@/lib/store";

const STATI: Stato[] = ["In recupero", "Quasi guarito", "Critico", "Guarito"];

const statoColor: Record<Stato, string> = {
  "In recupero": "bg-blue-100 text-blue-700",
  "Quasi guarito": "bg-green-100 text-green-700",
  "Critico": "bg-red-100 text-red-700",
  "Guarito": "bg-gray-100 text-gray-600",
};

const vuoto: Omit<Atleta, "id"> = {
  nome: "",
  eta: "",
  posizione: "",
  infortunio: "",
  inizioRehab: new Date().toISOString().slice(0, 10),
  stato: "In recupero",
  progresso: 0,
  fisioterapista: "",
  telefono: "",
  email: "",
  note: "",
};

export default function AtletiPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Atleta | null>(null);
  const [mostraForm, setMostraForm] = useState(false);
  const [form, setForm] = useState<Omit<Atleta, "id">>(vuoto);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    setAtleti(loadAtleti());
  }, []);

  const salva = (nuovi: Atleta[]) => {
    setAtleti(nuovi);
    saveAtleti(nuovi);
  };

  const apriNuovo = () => {
    setForm(vuoto);
    setEditId(null);
    setMostraForm(true);
    setSelected(null);
  };

  const apriModifica = (a: Atleta) => {
    const { id, ...rest } = a;
    setForm(rest);
    setEditId(id);
    setMostraForm(true);
    setSelected(null);
  };

  const salvaAtleta = () => {
    if (!form.nome.trim()) return;
    if (editId) {
      const nuovi = atleti.map((a) => (a.id === editId ? { ...form, id: editId } : a));
      salva(nuovi);
    } else {
      salva([...atleti, { ...form, id: uid() }]);
    }
    setMostraForm(false);
  };

  const elimina = (id: string) => {
    salva(atleti.filter((a) => a.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const filtered = atleti.filter(
    (a) =>
      a.nome.toLowerCase().includes(search.toLowerCase()) ||
      a.infortunio.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Atleti</h1>
            <p className="text-gray-500 mt-1">{atleti.length} atleti nel programma</p>
          </div>
          <button
            onClick={apriNuovo}
            className="flex items-center gap-2 bg-[#003087] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors"
          >
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
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <User className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">Nessun atleta ancora</p>
            <p className="text-gray-300 text-sm mt-1">Clicca "Nuovo Atleta" per aggiungerne uno</p>
          </div>
        ) : (
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
                    {atleta.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-gray-900">{atleta.nome}</p>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statoColor[atleta.stato]}`}>
                        {atleta.stato}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{atleta.infortunio || "—"}</p>
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

      {/* Pannello dettaglio */}
      {selected && !mostraForm && (
        <div className="w-80 bg-white border-l border-gray-100 p-6 overflow-y-auto">
          <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 mb-6 text-sm">
            ✕ Chiudi
          </button>
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-[#003087] rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
              {selected.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{selected.nome}</h2>
            <p className="text-gray-500 text-sm">{selected.posizione}{selected.eta ? ` · ${selected.eta} anni` : ""}</p>
            <span className={`text-xs px-3 py-1 rounded-full font-medium mt-2 inline-block ${statoColor[selected.stato]}`}>
              {selected.stato}
            </span>
          </div>
          <div className="space-y-3">
            {selected.infortunio && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Infortunio</p>
                <p className="text-sm font-medium text-gray-900">{selected.infortunio}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Progresso</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#003087] rounded-full" style={{ width: `${selected.progresso}%` }} />
                </div>
                <span className="text-sm font-bold text-[#003087]">{selected.progresso}%</span>
              </div>
            </div>
            {selected.fisioterapista && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fisioterapista</p>
                <p className="text-sm font-medium text-gray-900">{selected.fisioterapista}</p>
              </div>
            )}
            {selected.note && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Note</p>
                <p className="text-sm text-gray-700">{selected.note}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => apriModifica(selected)}
              className="flex-1 flex items-center justify-center gap-2 border border-[#003087] text-[#003087] py-2.5 rounded-xl text-sm font-medium hover:bg-blue-50"
            >
              <Edit2 className="w-4 h-4" /> Modifica
            </button>
            <button
              onClick={() => elimina(selected.id)}
              className="flex items-center justify-center gap-2 border border-red-200 text-red-500 py-2.5 px-3 rounded-xl text-sm hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modale form */}
      {mostraForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editId ? "Modifica Atleta" : "Nuovo Atleta"}
              </h2>
              <button onClick={() => setMostraForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome e Cognome *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Es. Marco Rossi"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Età</label>
                  <input
                    value={form.eta}
                    onChange={(e) => setForm({ ...form, eta: e.target.value })}
                    placeholder="Es. 24"
                    type="number"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ruolo</label>
                  <input
                    value={form.posizione}
                    onChange={(e) => setForm({ ...form, posizione: e.target.value })}
                    placeholder="Es. Centrocampista"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Infortunio</label>
                <input
                  value={form.infortunio}
                  onChange={(e) => setForm({ ...form, infortunio: e.target.value })}
                  placeholder="Es. Lesione legamento crociato"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inizio Rehab</label>
                  <input
                    type="date"
                    value={form.inizioRehab}
                    onChange={(e) => setForm({ ...form, inizioRehab: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stato</label>
                  <select
                    value={form.stato}
                    onChange={(e) => setForm({ ...form, stato: e.target.value as Stato })}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] bg-white"
                  >
                    {STATI.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Progresso recupero: {form.progresso}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.progresso}
                  onChange={(e) => setForm({ ...form, progresso: Number(e.target.value) })}
                  className="mt-2 w-full accent-[#003087]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fisioterapista</label>
                <input
                  value={form.fisioterapista}
                  onChange={(e) => setForm({ ...form, fisioterapista: e.target.value })}
                  placeholder="Es. Dott. Conti"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefono</label>
                  <input
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="+39 333 0000000"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="nome@email.it"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Note</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Note aggiuntive..."
                  rows={3}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setMostraForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={salvaAtleta}
                disabled={!form.nome.trim()}
                className="flex-1 bg-[#003087] text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editId ? "Salva modifiche" : "Aggiungi atleta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

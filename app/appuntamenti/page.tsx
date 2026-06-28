"use client";

import { useEffect, useState } from "react";
import { Plus, Clock, Trash2, X, Calendar } from "lucide-react";
import { loadAtleti, loadAppuntamenti, saveAppuntamenti, uid, type Atleta, type Appuntamento } from "@/lib/store";

const TIPI = ["Fisioterapia", "Recupero muscolare", "Valutazione", "Idroterapia", "Rieducazione motoria", "Esercizi", "Altro"];
const STANZE = ["Sala A", "Sala B", "Palestra", "Piscina", "Esterno"];

const vuoto: Omit<Appuntamento, "id"> = {
  atletaId: "",
  data: new Date().toISOString().slice(0, 10),
  ora: "09:00",
  tipo: "Fisioterapia",
  durata: "60",
  stanza: "Sala A",
  stato: "programmato",
};

const statoColor: Record<string, string> = {
  completato: "bg-green-100 border-green-300 text-green-800",
  "in corso": "bg-yellow-100 border-yellow-300 text-yellow-800",
  programmato: "bg-gray-100 border-gray-200 text-gray-600",
};

export default function AppuntamentiPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);
  const [filtroData, setFiltroData] = useState(new Date().toISOString().slice(0, 10));
  const [mostraForm, setMostraForm] = useState(false);
  const [form, setForm] = useState<Omit<Appuntamento, "id">>(vuoto);

  useEffect(() => {
    setAtleti(loadAtleti());
    setAppuntamenti(loadAppuntamenti());
  }, []);

  const salva = (nuovi: Appuntamento[]) => {
    setAppuntamenti(nuovi);
    saveAppuntamenti(nuovi);
  };

  const aggiungi = () => {
    if (!form.atletaId) return;
    salva([...appuntamenti, { ...form, id: uid() }]);
    setMostraForm(false);
  };

  const eliminaApp = (id: string) => salva(appuntamenti.filter((a) => a.id !== id));

  const cambiaStato = (id: string, stato: Appuntamento["stato"]) => {
    salva(appuntamenti.map((a) => (a.id === id ? { ...a, stato } : a)));
  };

  const filtrati = appuntamenti
    .filter((a) => a.data === filtroData)
    .sort((a, b) => a.ora.localeCompare(b.ora));

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appuntamenti</h1>
          <p className="text-gray-500 mt-1">{filtrati.length} appuntamenti il {new Date(filtroData + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] bg-white"
          />
          <button
            onClick={() => { setForm({ ...vuoto, data: filtroData }); setMostraForm(true); }}
            className="flex items-center gap-2 bg-[#003087] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuovo
          </button>
        </div>
      </div>

      {filtrati.length === 0 ? (
        <div className="text-center py-20">
          <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">Nessun appuntamento in questa data</p>
          <button
            onClick={() => { setForm({ ...vuoto, data: filtroData }); setMostraForm(true); }}
            className="text-[#003087] text-sm font-medium mt-2 inline-block hover:underline"
          >
            + Aggiungi appuntamento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrati.map((app) => {
            const atleta = atleti.find((a) => a.id === app.atletaId);
            return (
              <div key={app.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all">
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2 w-20 shrink-0">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-mono font-bold text-gray-700">{app.ora}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{atleta?.nome ?? "Atleta eliminato"}</p>
                    <p className="text-sm text-gray-500">{app.tipo} · {app.durata} min · {app.stanza}</p>
                  </div>
                  <select
                    value={app.stato}
                    onChange={(e) => cambiaStato(app.id, e.target.value as Appuntamento["stato"])}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium border cursor-pointer bg-transparent ${statoColor[app.stato]}`}
                  >
                    <option value="programmato">Programmato</option>
                    <option value="in corso">In corso</option>
                    <option value="completato">Completato</option>
                  </select>
                  <button onClick={() => eliminaApp(app.id)} className="text-gray-300 hover:text-red-400 ml-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale */}
      {mostraForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Nuovo Appuntamento</h2>
              <button onClick={() => setMostraForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Atleta *</label>
                <select
                  value={form.atletaId}
                  onChange={(e) => setForm({ ...form, atletaId: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] bg-white"
                >
                  <option value="">Seleziona atleta...</option>
                  {atleti.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
                {atleti.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">Prima aggiungi un atleta nella sezione Atleti.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ora</label>
                  <input
                    type="time"
                    value={form.ora}
                    onChange={(e) => setForm({ ...form, ora: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo seduta</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] bg-white"
                >
                  {TIPI.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Durata (min)</label>
                  <input
                    type="number"
                    value={form.durata}
                    onChange={(e) => setForm({ ...form, durata: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stanza</label>
                  <select
                    value={form.stanza}
                    onChange={(e) => setForm({ ...form, stanza: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] bg-white"
                  >
                    {STANZE.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setMostraForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
                Annulla
              </button>
              <button
                onClick={aggiungi}
                disabled={!form.atletaId}
                className="flex-1 bg-[#003087] text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Trash2, Edit2, X, User, ChevronRight, Phone, Mail } from "lucide-react";
import {
  loadAtleti, saveAtleti, uid,
  CATEGORIE, PIEDI,
  type Atleta, type Stato, type Categoria, type Piede,
} from "@/lib/store";

const STATI: Stato[] = ["In recupero", "Quasi guarito", "Critico", "Guarito"];

const statoColor: Record<Stato, string> = {
  "In recupero":  "bg-blue-100 text-blue-700",
  "Quasi guarito":"bg-green-100 text-green-700",
  "Critico":      "bg-red-100 text-red-700",
  "Guarito":      "bg-gray-100 text-gray-600",
};

const atletaVuoto: Omit<Atleta, "id"> = {
  nome: "", dataNascita: "", categoria: "Primavera",
  posizione: "", piedeDominante: "Destro",
  infortunio: "", inizioRehab: new Date().toISOString().slice(0, 10),
  stato: "In recupero", progresso: 0,
  fisioterapista: "", telefono: "", email: "", note: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white ${props.className ?? ""}`}
    />
  );
}

export default function AtletiPage() {
  const [atleti, setAtleti] = useState<Atleta[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Atleta | null>(null);
  const [mostraForm, setMostraForm] = useState(false);
  const [form, setForm] = useState<Omit<Atleta, "id">>(atletaVuoto);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => { setAtleti(loadAtleti()); }, []);

  const salva = (nuovi: Atleta[]) => { setAtleti(nuovi); saveAtleti(nuovi); };

  const apriNuovo = () => {
    setForm(atletaVuoto); setEditId(null); setMostraForm(true); setSelected(null);
  };

  const apriModifica = (a: Atleta) => {
    const { id, ...rest } = a;
    setForm(rest); setEditId(id); setMostraForm(true); setSelected(null);
  };

  const salvaAtleta = () => {
    if (!form.nome.trim()) return;
    if (editId) {
      salva(atleti.map((a) => (a.id === editId ? { ...form, id: editId } : a)));
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
    (a) => a.nome.toLowerCase().includes(search.toLowerCase()) ||
           a.infortunio.toLowerCase().includes(search.toLowerCase()) ||
           a.categoria.toLowerCase().includes(search.toLowerCase())
  );

  // Raggruppamento per categoria
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
                    <div key={atleta.id}
                      onClick={() => setSelected(atleta)}
                      className={`bg-white rounded-xl p-4 border cursor-pointer transition-all hover:shadow-md ${
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
                          <p className="text-sm text-gray-400">{atleta.posizione}{atleta.piedeDominante ? ` · Piede ${atleta.piedeDominante}` : ""}</p>
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
        <div className="w-80 bg-white border-l border-gray-100 p-6 overflow-y-auto">
          <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 mb-5 text-sm">✕ Chiudi</button>
          <div className="text-center mb-5">
            <div className="w-16 h-16 bg-[#2B2B2B] rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">
              {selected.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <h2 className="text-lg font-bold text-gray-900">{selected.nome}</h2>
            <p className="text-gray-500 text-sm">{selected.posizione} · {selected.categoria}</p>
            <span className={`text-xs px-3 py-1 rounded-full font-medium mt-1 inline-block ${statoColor[selected.stato]}`}>
              {selected.stato}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            {[
              ["Data di nascita", selected.dataNascita ? new Date(selected.dataNascita + "T12:00").toLocaleDateString("it-IT") : "—"],
              ["Piede dominante", selected.piedeDominante || "—"],
              ["Inizio riabilitazione", selected.inizioRehab ? new Date(selected.inizioRehab + "T12:00").toLocaleDateString("it-IT") : "—"],
              ["Fisioterapista", selected.fisioterapista || "—"],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="font-medium text-gray-900">{value}</p>
              </div>
            ))}

            {selected.infortunio && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Infortunio</p>
                <p className="font-medium text-gray-900">{selected.infortunio}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Progresso</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C8102E] rounded-full" style={{ width: `${selected.progresso}%` }} />
                </div>
                <span className="text-sm font-bold text-[#C8102E]">{selected.progresso}%</span>
              </div>
            </div>

            {selected.telefono && (
              <div className="flex items-center gap-2 text-gray-600 px-1">
                <Phone className="w-4 h-4 text-gray-400" />{selected.telefono}
              </div>
            )}
            {selected.email && (
              <div className="flex items-center gap-2 text-gray-600 px-1">
                <Mail className="w-4 h-4 text-gray-400" />{selected.email}
              </div>
            )}
            {selected.note && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Note</p>
                <p className="text-gray-700">{selected.note}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-5">
            <button onClick={() => apriModifica(selected)}
              className="flex-1 flex items-center justify-center gap-2 border border-[#C8102E] text-[#C8102E] py-2.5 rounded-xl text-sm font-medium hover:bg-red-50">
              <Edit2 className="w-4 h-4" /> Modifica
            </button>
            <button onClick={() => elimina(selected.id)}
              className="border border-gray-200 text-gray-400 py-2.5 px-3 rounded-xl hover:text-red-400 hover:border-red-200">
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
              <h2 className="text-lg font-bold text-gray-900">{editId ? "Modifica Atleta" : "Nuovo Atleta"}</h2>
              <button onClick={() => setMostraForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <Field label="Nome e Cognome *">
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Es. Marco Rossi" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Data di nascita">
                  <Input type="date" value={form.dataNascita} onChange={(e) => setForm({ ...form, dataNascita: e.target.value })} />
                </Field>
                <Field label="Categoria">
                  <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria })}>
                    {CATEGORIE.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Ruolo / Posizione">
                  <Input value={form.posizione} onChange={(e) => setForm({ ...form, posizione: e.target.value })} placeholder="Es. Centrocampista" />
                </Field>
                <Field label="Piede dominante">
                  <Select value={form.piedeDominante} onChange={(e) => setForm({ ...form, piedeDominante: e.target.value as Piede })}>
                    {PIEDI.map((p) => <option key={p}>{p}</option>)}
                  </Select>
                </Field>
              </div>

              <Field label="Infortunio">
                <Input value={form.infortunio} onChange={(e) => setForm({ ...form, infortunio: e.target.value })} placeholder="Es. Lesione legamento crociato" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Inizio Riabilitazione">
                  <Input type="date" value={form.inizioRehab} onChange={(e) => setForm({ ...form, inizioRehab: e.target.value })} />
                </Field>
                <Field label="Stato">
                  <Select value={form.stato} onChange={(e) => setForm({ ...form, stato: e.target.value as Stato })}>
                    {STATI.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </Field>
              </div>

              <Field label={`Progresso recupero: ${form.progresso}%`}>
                <input type="range" min={0} max={100} value={form.progresso}
                  onChange={(e) => setForm({ ...form, progresso: Number(e.target.value) })}
                  className="w-full accent-[#C8102E] mt-2" />
              </Field>

              <Field label="Fisioterapista">
                <Input value={form.fisioterapista} onChange={(e) => setForm({ ...form, fisioterapista: e.target.value })} placeholder="Es. Dott. Conti" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefono">
                  <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+39 333 0000000" />
                </Field>
                <Field label="Email">
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@email.it" />
                </Field>
              </div>

              <Field label="Note">
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Note aggiuntive..." rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] resize-none" />
              </Field>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setMostraForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
                Annulla
              </button>
              <button onClick={salvaAtleta} disabled={!form.nome.trim()}
                className="flex-1 bg-[#C8102E] text-white py-3 rounded-xl text-sm font-medium hover:bg-red-800 disabled:opacity-40">
                {editId ? "Salva modifiche" : "Aggiungi atleta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

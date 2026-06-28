"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { CATEGORIE, PIEDI, type Atleta, type Stato, type Categoria, type Piede } from "@/lib/store";

const STATI: Stato[] = ["In recupero", "Quasi guarito", "Guarito"];

const atletaVuoto: Omit<Atleta, "id"> = {
  nome: "", dataNascita: "", categoria: "Primavera",
  posizione: "", piedeDominante: "Destro",
  infortunio: "", inizioRehab: new Date().toISOString().slice(0, 10),
  stato: "In recupero", progresso: 0,
  fisioterapista: "", preparatoreAtletico: "",
  telefono: "", email: "", note: "",
};

interface Props {
  atletaIniziale?: Atleta;
  onSalva: (dati: Omit<Atleta, "id">) => void;
  onChiudi: () => void;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] ${props.className ?? ""}`} />
  );
}

function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select {...props}
      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white ${props.className ?? ""}`} />
  );
}

function Label({ children }: { children: string }) {
  return <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{children}</label>;
}

export default function AtletaModal({ atletaIniziale, onSalva, onChiudi }: Props) {
  const isModifica = !!atletaIniziale;
  const [form, setForm] = useState<Omit<Atleta, "id">>(
    atletaIniziale ? (({ id, ...rest }) => rest)(atletaIniziale) : atletaVuoto
  );

  const f = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {isModifica ? "Modifica Atleta" : "Nuovo Atleta"}
          </h2>
          <button onClick={onChiudi}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <Label>Nome e Cognome *</Label>
            <Input className="mt-1" value={form.nome} onChange={(e) => f("nome", e.target.value)} placeholder="Es. Marco Rossi" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data di nascita</Label>
              <Input className="mt-1" type="date" value={form.dataNascita} onChange={(e) => f("dataNascita", e.target.value)} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Sel className="mt-1" value={form.categoria} onChange={(e) => f("categoria", e.target.value as Categoria)}>
                {CATEGORIE.map((c) => <option key={c}>{c}</option>)}
              </Sel>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ruolo / Posizione</Label>
              <Input className="mt-1" value={form.posizione} onChange={(e) => f("posizione", e.target.value)} placeholder="Es. Centrocampista" />
            </div>
            <div>
              <Label>Piede dominante</Label>
              <Sel className="mt-1" value={form.piedeDominante} onChange={(e) => f("piedeDominante", e.target.value as Piede)}>
                {PIEDI.map((p) => <option key={p}>{p}</option>)}
              </Sel>
            </div>
          </div>

          <div>
            <Label>Infortunio</Label>
            <Input className="mt-1" value={form.infortunio} onChange={(e) => f("infortunio", e.target.value)} placeholder="Es. Lesione legamento crociato" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Inizio Riabilitazione</Label>
              <Input className="mt-1" type="date" value={form.inizioRehab} onChange={(e) => f("inizioRehab", e.target.value)} />
            </div>
            <div>
              <Label>Stato</Label>
              <Sel className="mt-1" value={form.stato} onChange={(e) => f("stato", e.target.value as Stato)}>
                {STATI.map((s) => <option key={s}>{s}</option>)}
              </Sel>
            </div>
          </div>

          {form.stato === "Guarito" && (
            <div>
              <Label>Data fine riabilitazione</Label>
              <Input className="mt-1" type="date" value={form.fineRehab ?? ""} onChange={(e) => f("fineRehab", e.target.value)} />
            </div>
          )}

          <div>
            <Label>{`Progresso recupero: ${form.progresso}%`}</Label>
            <input type="range" min={0} max={100} value={form.progresso}
              onChange={(e) => f("progresso", Number(e.target.value))}
              className="w-full accent-[#C8102E] mt-2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fisioterapista</Label>
              <Input className="mt-1" value={form.fisioterapista} onChange={(e) => f("fisioterapista", e.target.value)} placeholder="Es. Dott. Conti" />
            </div>
            <div>
              <Label>Preparatore atletico</Label>
              <Input className="mt-1" value={form.preparatoreAtletico} onChange={(e) => f("preparatoreAtletico", e.target.value)} placeholder="Es. Sig. Rossi" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefono</Label>
              <Input className="mt-1" value={form.telefono} onChange={(e) => f("telefono", e.target.value)} placeholder="+39 333 0000000" />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1" value={form.email} onChange={(e) => f("email", e.target.value)} placeholder="nome@email.it" />
            </div>
          </div>

          <div>
            <Label>Note</Label>
            <textarea value={form.note} onChange={(e) => f("note", e.target.value)}
              placeholder="Note aggiuntive..." rows={3}
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] resize-none" />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onChiudi}
            className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
            Annulla
          </button>
          <button onClick={() => form.nome.trim() && onSalva(form)} disabled={!form.nome.trim()}
            className="flex-1 bg-[#C8102E] text-white py-3 rounded-xl text-sm font-medium hover:bg-red-800 disabled:opacity-40">
            {isModifica ? "Salva modifiche" : "Aggiungi atleta"}
          </button>
        </div>
      </div>
    </div>
  );
}

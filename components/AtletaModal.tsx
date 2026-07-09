"use client";

import { useState, useEffect } from "react";
import { X, Zap } from "lucide-react";
import { CATEGORIE, PIEDI, TIPI_INFORTUNIO, EVENTI_INFORTUNIO, MECCANISMI_INFORTUNIO, CONTATTI_INFORTUNIO, LATI_INFORTUNIO, POSIZIONI_INFORTUNIO, calcolaPHV, type Atleta, type Stato, type Categoria, type Piede, type TipoInfortunio } from "@/lib/store";

interface PerfAthlete {
  id: string;
  name: string;
  code?: string;
  position: string;
  birth_date: string;
  jersey_number: number;
  vmax_kmh: number;
  preferred_foot?: string;
}

const STATI: Stato[] = ["Infortunato", "Disponibile"];

const atletaVuoto: Omit<Atleta, "id"> = {
  nome: "", dataNascita: "", categoria: "" as Categoria,
  posizione: "", piedeDominante: "" as Piede,
  infortunio: "", inizioRehab: new Date().toISOString().slice(0, 10),
  stato: "Infortunato", progresso: 0,
  fisioterapista: "", preparatoreAtletico: "",
  telefono: "", email: "", note: "",
  peso: "", altezza: "", altezzaDaSeduto: "",
};

interface Props {
  atletaIniziale?: Atleta;
  onSalva: (dati: Omit<Atleta, "id">) => void;
  onChiudi: () => void;
}

function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  if (type === "date") {
    return (
      <div className={`mt-1 w-full border border-gray-200 rounded-xl px-4 focus-within:ring-2 focus-within:ring-[#C8102E] bg-white ${className ?? ""}`}>
        <input type="date" {...props}
          className="w-full py-3 text-sm bg-transparent border-0 outline-none focus:outline-none text-gray-900" />
      </div>
    );
  }
  return (
    <input type={type} {...props}
      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] ${className ?? ""}`} />
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

function generaSigla(nome: string, dataNascita: string, categoria: string): string {
  const parts = nome.trim().split(/\s+/);
  const fn = parts[0] ?? "";
  const ln = parts[1] ?? "";
  const cap = (s: string) => s.length > 0 ? s[0].toUpperCase() + (s[1]?.toLowerCase() ?? "") : "";
  const anno = dataNascita ? dataNascita.slice(2, 4) : "??";
  return `${cap(fn)}.${cap(ln)}.${anno}${categoria ? "_" + categoria : ""}`;
}

export default function AtletaModal({ atletaIniziale, onSalva, onChiudi }: Props) {
  const isModifica = !!atletaIniziale;
  const [form, setForm] = useState<Omit<Atleta, "id">>(
    atletaIniziale ? (({ id, ...rest }) => rest)(atletaIniziale) : atletaVuoto
  );
  const [perfAthletes, setPerfAthletes] = useState<PerfAthlete[]>([]);
  const [perfLoading, setPerfLoading] = useState(false);

  useEffect(() => {
    if (isModifica) return;
    setPerfLoading(true);
    fetch("/api/performance/athletes")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setPerfAthletes(d.athletes ?? d ?? []); })
      .catch(() => {})
      .finally(() => setPerfLoading(false));
  }, [isModifica]);

  const f = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const importaDaPerf = (perfId: string) => {
    const p = perfAthletes.find((a) => a.id === perfId);
    if (!p) return;
    const footMap: Record<string, Piede> = { destro: "Destro", sinistro: "Sinistro", ambidestro: "Ambidestro" };
    const piede = p.preferred_foot ? (footMap[p.preferred_foot.toLowerCase()] ?? "") : "";
    setForm((prev) => ({
      ...prev,
      nome: p.name,
      posizione: p.position ?? "",
      dataNascita: p.birth_date ?? "",
      categoria: "U17" as Categoria,
      ...(piede ? { piedeDominante: piede as Piede } : {}),
    }));
  };

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
          {/* Importa da Performance */}
          {!isModifica && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#C8102E]" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Importa da app Performance</span>
              </div>
              <select
                defaultValue=""
                onChange={(e) => importaDaPerf(e.target.value)}
                disabled={perfLoading || perfAthletes.length === 0}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E] disabled:opacity-50"
              >
                <option value="">{perfLoading ? "Caricamento giocatori..." : perfAthletes.length === 0 ? "Nessun giocatore disponibile" : "— Seleziona giocatore —"}</option>
                {perfAthletes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.jersey_number ? ` · #${p.jersey_number}` : ""}{p.position ? ` · ${p.position}` : ""}
                  </option>
                ))}
              </select>
              {perfAthletes.length > 0 && (
                <p className="text-xs text-gray-400">Seleziona un giocatore per compilare automaticamente nome, posizione e data di nascita.</p>
              )}
            </div>
          )}

          <div>
            <Label>Cognome e Nome *</Label>
            <Input className="mt-1" value={form.nome} onChange={(e) => f("nome", e.target.value)} placeholder="Es. Rossi Marco" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Sel className="mt-1" value={form.categoria} onChange={(e) => f("categoria", e.target.value as Categoria)}>
                <option value="">—</option>
                {CATEGORIE.map((c) => <option key={c}>{c}</option>)}
              </Sel>
            </div>
            <div>
              <Label>Piede dominante</Label>
              <Sel className="mt-1" value={form.piedeDominante} onChange={(e) => f("piedeDominante", e.target.value as Piede)}>
                <option value="">—</option>
                {PIEDI.map((p) => <option key={p}>{p}</option>)}
              </Sel>
            </div>
          </div>

          <div>
            <Label>Ruolo / Posizione</Label>
            <Input className="mt-1" value={form.posizione} onChange={(e) => f("posizione", e.target.value)} placeholder="Es. Centrocampista" />
          </div>

          <div>
            <Label>Data di nascita</Label>
            <Input className="mt-1" type="date" value={form.dataNascita} onChange={(e) => f("dataNascita", e.target.value)} />
          </div>

          <div>
            <Label>Tipologia</Label>
            <Sel className="mt-1" value={form.tipoInfortunio ?? ""} onChange={(e) => f("tipoInfortunio", e.target.value as TipoInfortunio)}>
              <option value="">—</option>
              {TIPI_INFORTUNIO.map((t) => <option key={t}>{t}</option>)}
            </Sel>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Evento</Label>
              <Sel className="mt-1" value={form.evento ?? ""} onChange={(e) => f("evento", e.target.value)}>
                <option value="">—</option>
                {EVENTI_INFORTUNIO.map((v) => <option key={v}>{v}</option>)}
              </Sel>
            </div>
            <div>
              <Label>Contatto</Label>
              <Sel className="mt-1" value={form.contatto ?? ""} onChange={(e) => f("contatto", e.target.value)}>
                <option value="">—</option>
                {CONTATTI_INFORTUNIO.map((v) => <option key={v}>{v}</option>)}
              </Sel>
            </div>
          </div>

          <div>
            <Label>Meccanismo</Label>
            <Sel className="mt-1" value={form.meccanismo ?? ""} onChange={(e) => f("meccanismo", e.target.value)}>
              <option value="">—</option>
              {MECCANISMI_INFORTUNIO.map((v) => <option key={v}>{v}</option>)}
            </Sel>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lato</Label>
              <Sel className="mt-1" value={form.lato ?? ""} onChange={(e) => f("lato", e.target.value)}>
                <option value="">—</option>
                {LATI_INFORTUNIO.map((v) => <option key={v}>{v}</option>)}
              </Sel>
            </div>
            <div>
              <Label>Posizione</Label>
              <Sel className="mt-1" value={form.posizioneInfortunio ?? ""} onChange={(e) => f("posizioneInfortunio", e.target.value)}>
                <option value="">—</option>
                {POSIZIONI_INFORTUNIO.map((v) => <option key={v}>{v}</option>)}
              </Sel>
            </div>
          </div>

          <div>
            <Label>Diagnosi / Infortunio</Label>
            <Input className="mt-1" value={form.infortunio} onChange={(e) => f("infortunio", e.target.value)} placeholder="Es. Lesione LCA" />
          </div>

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

          {form.stato === "Disponibile" && (
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

          {/* Dati antropometrici */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Dati antropometrici</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Peso (kg)</Label>
                <Input className="mt-1" type="number" min="0" step="0.1"
                  value={form.peso ?? ""} onChange={(e) => f("peso", e.target.value)}
                  placeholder="es. 68" />
              </div>
              <div>
                <Label>Altezza (cm)</Label>
                <Input className="mt-1" type="number" min="0" step="0.1"
                  value={form.altezza ?? ""} onChange={(e) => f("altezza", e.target.value)}
                  placeholder="es. 175" />
              </div>
              <div>
                <Label>Alt. da seduto (cm)</Label>
                <Input className="mt-1" type="number" min="0" step="0.1"
                  value={form.altezzaDaSeduto ?? ""} onChange={(e) => f("altezzaDaSeduto", e.target.value)}
                  placeholder="es. 90" />
              </div>
            </div>

            {/* PHV calcolato */}
            {(() => {
              const phv = calcolaPHV(form.altezza ?? "", form.altezzaDaSeduto ?? "", form.peso ?? "", form.dataNascita);
              if (!phv) return (
                <p className="text-xs text-gray-400 mt-3 italic">
                  Inserisci peso, altezza, altezza da seduto e data di nascita per calcolare il PHV.
                </p>
              );
              const postPre = phv.offset >= 0 ? "post-PHV" : "pre-PHV";
              const colore = phv.offset >= 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-blue-50 border-blue-200 text-blue-800";
              return (
                <div className={`mt-3 rounded-xl border p-3 ${colore}`}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-1">PHV – Peak Height Velocity</p>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-xs opacity-70">Maturity Offset</span>
                      <p className="font-bold">
                        {phv.offset >= 0 ? "+" : ""}{phv.offset} anni
                        <span className="text-xs font-normal ml-1 opacity-70">({postPre})</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-xs opacity-70">Età stimata al PHV</span>
                      <p className="font-bold">{phv.etaPHV} anni</p>
                    </div>
                  </div>
                  <p className="text-[10px] opacity-50 mt-1">Formula Mirwald et al. 2002 – sesso maschile</p>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onChiudi}
            className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
            Annulla
          </button>
          <button onClick={() => {
              if (!isModifica && !form.nome.trim()) return;
              onSalva(form);
            }} disabled={!isModifica && !form.nome.trim()}
            className="flex-1 bg-[#C8102E] text-white py-3 rounded-xl text-sm font-medium hover:bg-red-800 disabled:opacity-40">
            {isModifica ? "Salva modifiche" : "Aggiungi atleta"}
          </button>
        </div>
      </div>
    </div>
  );
}

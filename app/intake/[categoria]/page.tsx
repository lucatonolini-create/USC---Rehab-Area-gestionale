"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import PlayerCombobox from "@/components/PlayerCombobox";
import OsiicsCombobox from "@/components/OsiicsCombobox";
import DettaglioSituazionale, { type DettaglioSituazionaleHandle } from "@/components/DettaglioSituazionale";
import type { OsiicsCode } from "@/lib/store";

const CATEGORIA_MAP: Record<string, string> = {
  u19: "U19", u17: "U17", u16: "U16", u15: "U15", u14: "U14",
};

const CATEGORIE_FORM = ["1ª Squadra", "U19", "U17", "U16", "U15", "U14", "Altra squadra", "Provino"];

const PIEDI = ["Ambidestro", "Destro", "Sinistro"];
const TIPI_INFORTUNIO = [
  "Abrasione","Altri infortuni","Altro Infortunio Osseo",
  "Concussion (with or without loss of consciousness)","Cutaneo","Dislocazione/Sublussazione",
  "Distorsione/Lesione Legamentosa","Ematoma/Contusione","Frattura",
  "Infortunio Dentale","Infortunio Nervoso","Lacerazione/Taglio",
  "Lesione meniscale o cartilaginea","Malattia","Muscolare: Strappo/Stiramento/Crampo",
  "Tendineo: Tendinopatia/Lesione/Borsite","Vescica",
];
const EVENTI_INFORTUNIO = ["Allenamento", "Extra Campo", "Partita"];
const MECCANISMI_INFORTUNIO = [
  "Caduta/Tuffo","Calciato","Cambio direzione/Pivot","Colpo di testa",
  "Contrasto effettuato","Contrasto subito","Corsa/Sprint","Dribbling",
  "Other acute","Overuse","Pallonata","Passaggio/Cross","Placcato",
  "Salto/atterraggio","Sbracciata/Gomitata","Scivolata","Scontro",
  "Stretching","Tiro",
];
const CONTATTI_INFORTUNIO = ["Contatto con attrezzo","Contatto con giocatore","Non contatto"];
const LATI_INFORTUNIO = ["Bilaterale","Destro","Non applicabile","Sinistro"];
const POSIZIONI_INFORTUNIO = [
  "Addome","Anca/Groin","Avambraccio","Braccio Superiore","Caviglia",
  "Collo/Rachide Cervicale","Coscia","Gamba inferiore/T.Achille","Ginocchio",
  "Gomito","Mano/Dita","Piede/Dita Piede","Polso","Rachide Lombare/Pelvi/Sacro",
  "Sistemico","Spalla/Clavicola","Sterno/Coste/Rachide Toracico","Testa/Faccia",
];

function Label({ children }: { children: string }) {
  return <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white ${props.className ?? ""}`} />
  );
}

function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select {...props}
      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white ${props.className ?? ""}`} />
  );
}

type FormState = {
  nome: string; posizione: string; piedeDominante: string;
  infortunio: string; inizioRehab: string; tipoInfortunio: string;
  evento: string; meccanismo: string; contatto: string;
  lato: string; posizioneInfortunio: string; note: string;
  fisioterapista: string; categoria: string;
  osiicsCodeId: string; osiicsCodice: string; osiicsDescrizione: string;
};

const RUOLI = ["Attaccante", "Centrocampista", "Difensore", "Portiere"];

const vuoto = (): FormState => ({
  nome: "", posizione: "", piedeDominante: "",
  infortunio: "", inizioRehab: new Date().toISOString().slice(0, 10),
  tipoInfortunio: "", evento: "", meccanismo: "", contatto: "",
  lato: "", posizioneInfortunio: "", note: "",
  fisioterapista: "", categoria: "",
  osiicsCodeId: "", osiicsCodice: "", osiicsDescrizione: "",
});

export default function IntakePage() {
  const params = useParams();
  const categoriaRaw = Array.isArray(params.categoria) ? params.categoria[0] : (params.categoria ?? "");
  const categoria = CATEGORIA_MAP[categoriaRaw.toLowerCase()] ?? null;

  const [form, setForm] = useState<FormState>(vuoto);
  const [stato, setStato] = useState<"idle" | "invio" | "ok" | "errore">("idle");
  const [errMsg, setErrMsg] = useState("");
  const dettaglioRef = useRef<DettaglioSituazionaleHandle>(null);
  const f = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  if (!categoria) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow text-center max-w-sm">
          <p className="text-gray-500 text-sm">Link non valido.</p>
        </div>
      </div>
    );
  }

  if (stato === "ok") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Segnalazione inviata</h2>
          <p className="text-sm text-gray-500 mb-5">Il giocatore è stato aggiunto al gestionale rehab. Grazie.</p>
          <button
            onClick={() => { setForm(vuoto()); setStato("idle"); setErrMsg(""); dettaglioRef.current?.reset(); }}
            className="w-full bg-[#C8102E] text-white py-3 rounded-xl text-sm font-semibold hover:bg-red-800 transition-colors">
            Inserisci un altro infortunio
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.categoria) return;
    setStato("invio");
    setErrMsg("");
    try {
      const dettaglio = dettaglioRef.current?.hasData() ? dettaglioRef.current.getValues() : undefined;
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dettaglio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore sconosciuto");
      setStato("ok");
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setStato("errore");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shadow flex items-center justify-center p-1 shrink-0">
            <Image src="/logo.png" alt="U.S. Cremonese" width={44} height={44} className="object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">U.S. Cremonese</h1>
            <p className="text-xs text-gray-400">Segnalazione Infortunio · <span className="font-semibold text-[#C8102E]">{categoria}</span></p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#C8102E] px-6 py-4">
            <h2 className="text-white font-bold text-base">Nuovo infortunio {categoria}</h2>
            <p className="text-white/70 text-xs mt-0.5">Compila tutti i campi disponibili e invia la segnalazione.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <Label>Cognome e Nome *</Label>
              <PlayerCombobox
                value={form.nome}
                required
                onSelect={(nome, g) => {
                  f("nome", nome);
                  if (g) {
                    f("posizione", g.ruolo);
                    f("categoria", g.categoria);
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria *</Label>
                <Sel value={form.categoria} onChange={(e) => f("categoria", e.target.value)} required>
                  <option value="">—</option>
                  {CATEGORIE_FORM.map((c) => <option key={c}>{c}</option>)}
                </Sel>
              </div>
              <div>
                <Label>Ruolo / Posizione</Label>
                <Sel value={form.posizione} onChange={(e) => f("posizione", e.target.value)}>
                  <option value="">—</option>
                  {RUOLI.map((r) => <option key={r}>{r}</option>)}
                </Sel>
              </div>
            </div>

            <div>
              <Label>Piede dominante</Label>
              <Sel value={form.piedeDominante} onChange={(e) => f("piedeDominante", e.target.value)}>
                <option value="">—</option>
                {PIEDI.map((p) => <option key={p}>{p}</option>)}
              </Sel>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Dettaglio infortunio</p>

              <div className="space-y-3">
                <div>
                  <Label>Tipologia</Label>
                  <Sel value={form.tipoInfortunio} onChange={(e) => f("tipoInfortunio", e.target.value)}>
                    <option value="">—</option>
                    {TIPI_INFORTUNIO.map((t) => <option key={t}>{t}</option>)}
                  </Sel>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Evento</Label>
                    <Sel value={form.evento} onChange={(e) => f("evento", e.target.value)}>
                      <option value="">—</option>
                      {EVENTI_INFORTUNIO.map((v) => <option key={v}>{v}</option>)}
                    </Sel>
                  </div>
                  <div>
                    <Label>Contatto</Label>
                    <Sel value={form.contatto} onChange={(e) => f("contatto", e.target.value)}>
                      <option value="">—</option>
                      {CONTATTI_INFORTUNIO.map((v) => <option key={v}>{v}</option>)}
                    </Sel>
                  </div>
                </div>

                <div>
                  <Label>Meccanismo</Label>
                  <Sel value={form.meccanismo} onChange={(e) => f("meccanismo", e.target.value)}>
                    <option value="">—</option>
                    {MECCANISMI_INFORTUNIO.map((v) => <option key={v}>{v}</option>)}
                  </Sel>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Lato</Label>
                    <Sel value={form.lato} onChange={(e) => f("lato", e.target.value)}>
                      <option value="">—</option>
                      {LATI_INFORTUNIO.map((v) => <option key={v}>{v}</option>)}
                    </Sel>
                  </div>
                  <div>
                    <Label>Posizione</Label>
                    <Sel value={form.posizioneInfortunio} onChange={(e) => f("posizioneInfortunio", e.target.value)}>
                      <option value="">—</option>
                      {POSIZIONI_INFORTUNIO.map((v) => <option key={v}>{v}</option>)}
                    </Sel>
                  </div>
                </div>

                <div>
                  <Label>Diagnosi / Descrizione infortunio</Label>
                  <Input value={form.infortunio} onChange={(e) => f("infortunio", e.target.value)} placeholder="Es. Lesione LCA, Distorsione caviglia…" />
                </div>

                <div className="border border-blue-100 rounded-xl p-3 bg-blue-50/40 space-y-2">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Classificazione OSIICS</p>
                  <OsiicsCombobox
                    value={form.osiicsCodeId ? { id: form.osiicsCodeId, codice: form.osiicsCodice, descrizioneIta: form.osiicsDescrizione } : null}
                    onChange={(code: OsiicsCode | null) => {
                      if (code) {
                        f("osiicsCodeId", code.id);
                        f("osiicsCodice", code.codice);
                        f("osiicsDescrizione", code.descrizioneIta);
                      } else {
                        f("osiicsCodeId", "");
                        f("osiicsCodice", "");
                        f("osiicsDescrizione", "");
                      }
                    }}
                  />
                </div>

                <div>
                  <Label>Data inizio riabilitazione</Label>
                  <Input type="date" value={form.inizioRehab} onChange={(e) => f("inizioRehab", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div>
                <Label>Note aggiuntive</Label>
                <textarea value={form.note} onChange={(e) => f("note", e.target.value)}
                  placeholder="Ulteriori informazioni sull'infortunio…" rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] resize-none" />
              </div>
              <div>
                <Label>Fisioterapista / Mittente</Label>
                <Input value={form.fisioterapista} onChange={(e) => f("fisioterapista", e.target.value)} placeholder="Il tuo nome" />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <DettaglioSituazionale ref={dettaglioRef} contatto={form.contatto} />
            </div>

            {stato === "errore" && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{errMsg}</p>
            )}

            <button type="submit" disabled={!form.nome.trim() || !form.categoria || stato === "invio"}
              className="w-full bg-[#C8102E] text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-red-800 disabled:opacity-40 transition-colors">
              {stato === "invio" ? "Invio in corso…" : "Invia segnalazione"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">U.S. Cremonese · Rehab Area</p>
      </div>
    </div>
  );
}

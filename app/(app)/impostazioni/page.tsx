"use client";

import { useEffect, useState } from "react";
import { Save, Plus, Trash2, Check, RefreshCw, AlertCircle } from "lucide-react";
import { loadImpostazioni, saveImpostazioni, pushAllLocalToSupabase, type Impostazioni } from "@/lib/store";

function ListaPersonale({
  titolo,
  lista,
  placeholder,
  onAggiungi,
  onRimuovi,
}: {
  titolo: string;
  lista: string[];
  placeholder: string;
  onAggiungi: (v: string) => void;
  onRimuovi: (i: number) => void;
}) {
  const [input, setInput] = useState("");
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{titolo}</h3>
      <div className="space-y-2 mb-3">
        {lista.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">Nessuno ancora</p>
        )}
        {lista.map((s, i) => (
          <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <span className="flex-1 text-sm text-gray-900">{s}</span>
            <button onClick={() => onRimuovi(i)} className="text-gray-300 hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { onAggiungi(input.trim()); setInput(""); } }}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
        <button onClick={() => { if (input.trim()) { onAggiungi(input.trim()); setInput(""); } }}
          className="flex items-center gap-1.5 bg-[#C8102E] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-800">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function ImpostazioniPage() {
  const [form, setForm] = useState<Impostazioni>({
    nomeClub: "", nomeStruttura: "", indirizzo: "", fisioterapisti: [], preparatori: [],
  });
  const [salvato, setSalvato] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [syncMsg, setSyncMsg] = useState("");
  useEffect(() => { loadImpostazioni().then(setForm); }, []);

  const salva = async () => {
    await saveImpostazioni(form);
    setSalvato(true);
    setTimeout(() => setSalvato(false), 2000);
  };

  const sincronizza = async () => {
    setSyncState("loading");
    setSyncMsg("");
    const { ok, fail, lastError } = await pushAllLocalToSupabase();
    if (fail === 0) {
      setSyncState("ok");
      setSyncMsg(`Sincronizzati ${ok} elementi con successo.`);
    } else {
      setSyncState("error");
      setSyncMsg(`${ok} sincronizzati, ${fail} falliti.${lastError ? ` Errore: ${lastError}` : ""}`);
    }
    setTimeout(() => setSyncState("idle"), 8000);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Impostazioni</h1>
          <p className="text-gray-500 mt-1">Configura il tuo gestionale</p>
        </div>
        <button onClick={salva}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            salvato ? "bg-green-500 text-white" : "bg-[#C8102E] text-white hover:bg-red-800"
          }`}>
          {salvato ? <><Check className="w-4 h-4" /> Salvato!</> : <><Save className="w-4 h-4" /> Salva</>}
        </button>
      </div>

      <div className="space-y-5">
        {/* Club */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Club e struttura</h2>
          <div className="space-y-4">
            {[
              { label: "Nome Club",                key: "nomeClub"      as keyof Impostazioni, ph: "Es. U.S. Cremonese" },
              { label: "Nome struttura / reparto", key: "nomeStruttura" as keyof Impostazioni, ph: "Es. Rehab Area" },
              { label: "Indirizzo",                key: "indirizzo"     as keyof Impostazioni, ph: "Es. Via dello Sport 1, Cremona" },
            ].map(({ label, key, ph }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
                <input value={form[key] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={ph}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
              </div>
            ))}
          </div>
        </div>

        {/* Staff */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          <h2 className="font-bold text-gray-900">Staff tecnico e medico</h2>

          <ListaPersonale
            titolo="Fisioterapisti"
            lista={form.fisioterapisti}
            placeholder="Es. Dott. Marco Conti"
            onAggiungi={(v) => setForm({ ...form, fisioterapisti: [...form.fisioterapisti, v] })}
            onRimuovi={(i) => setForm({ ...form, fisioterapisti: form.fisioterapisti.filter((_, idx) => idx !== i) })}
          />

          <div className="border-t border-gray-100 pt-6">
            <ListaPersonale
              titolo="Preparatori atletici"
              lista={form.preparatori}
              placeholder="Es. Sig. Luigi Rossi"
              onAggiungi={(v) => setForm({ ...form, preparatori: [...form.preparatori, v] })}
              onRimuovi={(i) => setForm({ ...form, preparatori: form.preparatori.filter((_, idx) => idx !== i) })}
            />
          </div>
        </div>

        {/* Sincronizzazione */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-1">Sincronizzazione dati</h2>
          <p className="text-sm text-gray-500 mb-4">
            Se i dati non compaiono su altri dispositivi, usa questo pulsante per forzare l&apos;upload di tutto il contenuto locale verso il server.
          </p>
          <button onClick={sincronizza} disabled={syncState === "loading"}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
              syncState === "ok" ? "bg-green-500 text-white" :
              syncState === "error" ? "bg-orange-500 text-white" :
              "bg-[#2B2B2B] text-white hover:bg-black"
            }`}>
            {syncState === "loading"
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sincronizzazione in corso…</>
              : syncState === "ok"
              ? <><Check className="w-4 h-4" /> Sincronizzato!</>
              : syncState === "error"
              ? <><AlertCircle className="w-4 h-4" /> Errore parziale</>
              : <><RefreshCw className="w-4 h-4" /> Sincronizza ora</>}
          </button>
          {syncMsg && (
            <p className={`mt-3 text-xs font-medium ${syncState === "error" ? "text-orange-600" : "text-green-600"}`}>
              {syncMsg}
            </p>
          )}
        </div>

<p className="text-xs text-gray-400 text-center">
          Premi "Salva" per confermare le modifiche.
        </p>
      </div>
    </div>
  );
}

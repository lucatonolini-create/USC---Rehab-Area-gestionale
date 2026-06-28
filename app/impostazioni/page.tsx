"use client";

import { useEffect, useState } from "react";
import { Save, Plus, Trash2, Check } from "lucide-react";
import { loadImpostazioni, saveImpostazioni, type Impostazioni } from "@/lib/store";

export default function ImpostazioniPage() {
  const [form, setForm] = useState<Impostazioni>({
    nomeClub: "", nomeStruttura: "", indirizzo: "", staff: [],
  });
  const [salvato, setSalvato] = useState(false);
  const [nuovoStaff, setNuovoStaff] = useState("");

  useEffect(() => { setForm(loadImpostazioni()); }, []);

  const salva = () => {
    saveImpostazioni(form);
    setSalvato(true);
    setTimeout(() => setSalvato(false), 2000);
  };

  const aggiungiStaff = () => {
    if (!nuovoStaff.trim()) return;
    setForm({ ...form, staff: [...form.staff, nuovoStaff.trim()] });
    setNuovoStaff("");
  };

  const rimuoviStaff = (i: number) =>
    setForm({ ...form, staff: form.staff.filter((_, idx) => idx !== i) });

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
              { label: "Nome Club", key: "nomeClub" as keyof Impostazioni, placeholder: "Es. USC Cremonese" },
              { label: "Nome struttura / reparto", key: "nomeStruttura" as keyof Impostazioni, placeholder: "Es. Rehab Area" },
              { label: "Indirizzo", key: "indirizzo" as keyof Impostazioni, placeholder: "Es. Via dello Sport 1, Cremona" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
                <input
                  value={form[key] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Staff */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Staff medico / fisioterapisti</h2>
          <div className="space-y-2 mb-4">
            {form.staff.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">Nessun membro dello staff ancora</p>
            )}
            {form.staff.map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <span className="flex-1 text-sm text-gray-900">{s}</span>
                <button onClick={() => rimuoviStaff(i)} className="text-gray-300 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={nuovoStaff}
              onChange={(e) => setNuovoStaff(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && aggiungiStaff()}
              placeholder="Es. Dott. Marco Conti – Fisioterapista"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
            />
            <button onClick={aggiungiStaff}
              className="flex items-center gap-1.5 bg-[#C8102E] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-800">
              <Plus className="w-4 h-4" /> Aggiungi
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          I dati vengono salvati localmente nel browser. Premi "Salva" per confermare le modifiche.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Save, Plus, Trash2, Check, RefreshCw, AlertCircle, Bell, BellOff, Send, Pencil, X } from "lucide-react";
import { loadImpostazioni, saveImpostazioni, pushAllLocalToSupabase, type Impostazioni, type GiocatoreRosa } from "@/lib/store";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}

function NotificheSection() {
  const [permesso, setPermesso] = useState<NotificationPermission | "unsupported">("default");
  const [attiva, setAttiva] = useState<boolean | null>(null);
  const [stato, setStato] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [testStato, setTestStato] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [testMsg, setTestMsg] = useState("");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermesso("unsupported");
      return;
    }
    setPermesso(Notification.permission);
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setAttiva(!!sub))
    ).catch(() => setAttiva(false));
  }, []);

  const abilita = async () => {
    if (!VAPID_PUBLIC_KEY) {
      setStato("error");
      setMsg("Chiave VAPID non configurata (NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
      return;
    }
    setStato("loading");
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      setPermesso(perm);
      if (perm !== "granted") {
        setStato("error");
        setMsg("Permesso negato. Abilitalo nelle impostazioni del browser.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error ?? "Errore salvataggio sottoscrizione");
      setAttiva(true);
      setStato("ok");
      setMsg("Notifiche attivate su questo dispositivo.");
    } catch (err) {
      setStato("error");
      setMsg(`Errore: ${err instanceof Error ? err.message : String(err)}`);
    }
    setTimeout(() => setStato("idle"), 5000);
  };

  const disabilita = async () => {
    setStato("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setAttiva(false);
      setStato("ok");
      setMsg("Notifiche disattivate.");
    } catch (err) {
      setStato("error");
      setMsg(`Errore: ${err instanceof Error ? err.message : String(err)}`);
    }
    setTimeout(() => setStato("idle"), 4000);
  };

  const inviaTest = async () => {
    setTestStato("loading");
    setTestMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setTestStato("error");
        setTestMsg("Nessuna sottoscrizione attiva. Prima abilita le notifiche.");
        setTimeout(() => setTestStato("idle"), 4000);
        return;
      }
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore sconosciuto");
      setTestStato("ok");
      setTestMsg("Notifica inviata — dovresti riceverla a breve.");
    } catch (err) {
      setTestStato("error");
      setTestMsg(`Errore: ${err instanceof Error ? err.message : String(err)}`);
    }
    setTimeout(() => setTestStato("idle"), 6000);
  };

  if (permesso === "unsupported") {
    return (
      <p className="text-sm text-gray-400">
        Questo browser non supporta le notifiche push.
      </p>
    );
  }

  const isLoading = stato === "loading";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${attiva ? "bg-green-500" : "bg-gray-300"}`} />
        <span className="text-sm text-gray-700">
          {attiva === null ? "Verifica in corso…" : attiva ? "Attive su questo dispositivo" : "Non attive su questo dispositivo"}
        </span>
      </div>

      {permesso === "denied" && (
        <p className="text-xs text-orange-600">
          Permesso bloccato. Vai nelle impostazioni del browser e abilita le notifiche per questo sito.
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        {!attiva && permesso !== "denied" && (
          <button
            onClick={abilita}
            disabled={isLoading}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
              stato === "ok" ? "bg-green-500 text-white" :
              stato === "error" ? "bg-orange-500 text-white" :
              "bg-[#C8102E] text-white hover:bg-red-800"
            }`}>
            {isLoading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Attivazione…</>
              : stato === "ok"
              ? <><Check className="w-4 h-4" /> Attivate!</>
              : stato === "error"
              ? <><AlertCircle className="w-4 h-4" /> Riprova</>
              : <><Bell className="w-4 h-4" /> Abilita notifiche</>}
          </button>
        )}
        {attiva && (
          <>
            <button
              onClick={abilita}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-[#2B2B2B] text-white hover:bg-black transition-all">
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Riattiva
            </button>
            <button
              onClick={disabilita}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all">
              <BellOff className="w-4 h-4" />
              Disabilita
            </button>
          </>
        )}
      </div>

      {msg && (
        <p className={`text-xs font-medium ${stato === "error" ? "text-orange-600" : "text-green-600"}`}>
          {msg}
        </p>
      )}

      {attiva && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">Verifica che le notifiche arrivino su questo dispositivo:</p>
          <button
            onClick={inviaTest}
            disabled={testStato === "loading"}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              testStato === "ok" ? "bg-green-500 text-white" :
              testStato === "error" ? "bg-orange-500 text-white" :
              "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {testStato === "loading"
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Invio…</>
              : testStato === "ok"
              ? <><Check className="w-4 h-4" /> Inviata!</>
              : testStato === "error"
              ? <><AlertCircle className="w-4 h-4" /> Errore</>
              : <><Send className="w-4 h-4" /> Invia notifica test</>}
          </button>
          {testMsg && (
            <p className={`mt-2 text-xs font-medium ${testStato === "error" ? "text-orange-600" : "text-green-600"}`}>
              {testMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

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

const CATEGORIE = ["U14", "U15", "U16", "U17", "U19"];
const RUOLI_ROSA = ["Attaccante", "Centrocampista", "Difensore", "Portiere"];

function RosaSection({
  rosa,
  onChange,
}: {
  rosa: GiocatoreRosa[];
  onChange: (r: GiocatoreRosa[]) => void;
}) {
  const [nuovo, setNuovo] = useState<GiocatoreRosa>({ nome: "", categoria: "", ruolo: "" });
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState<GiocatoreRosa>({ nome: "", categoria: "", ruolo: "" });

  const sorted = [...rosa].sort((a, b) => a.nome.localeCompare(b.nome));

  const aggiungi = () => {
    if (!nuovo.nome.trim() || !nuovo.categoria || !nuovo.ruolo) return;
    onChange([...rosa, { ...nuovo, nome: nuovo.nome.trim() }]);
    setNuovo({ nome: "", categoria: "", ruolo: "" });
  };

  const rimuovi = (nome: string) => onChange(rosa.filter((g) => g.nome !== nome));

  const salvaEdit = () => {
    if (editIdx === null || !editVal.nome.trim() || !editVal.categoria || !editVal.ruolo) return;
    const updated = [...rosa];
    updated[editIdx] = { ...editVal, nome: editVal.nome.trim() };
    onChange(updated);
    setEditIdx(null);
  };

  const inputCls = "flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]";
  const selCls = "border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white";

  return (
    <div className="space-y-3">
      {sorted.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">Nessun giocatore ancora</p>
      )}
      {sorted.map((g) => {
        const realIdx = rosa.findIndex((r) => r.nome === g.nome);
        return editIdx === realIdx ? (
          <div key={g.nome} className="bg-blue-50 rounded-xl p-3 space-y-2">
            <input value={editVal.nome} onChange={(e) => setEditVal({ ...editVal, nome: e.target.value })}
              placeholder="Cognome e Nome" className={`w-full ${inputCls}`} />
            <div className="flex gap-2">
              <select value={editVal.categoria} onChange={(e) => setEditVal({ ...editVal, categoria: e.target.value })}
                className={selCls}>
                <option value="">Categoria</option>
                {CATEGORIE.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={editVal.ruolo} onChange={(e) => setEditVal({ ...editVal, ruolo: e.target.value })}
                className={selCls}>
                <option value="">Ruolo</option>
                {RUOLI_ROSA.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={salvaEdit}
                className="flex items-center gap-1.5 bg-[#C8102E] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-800">
                <Check className="w-3 h-3" /> Salva
              </button>
              <button onClick={() => setEditIdx(null)}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50">
                <X className="w-3 h-3" /> Annulla
              </button>
            </div>
          </div>
        ) : (
          <div key={g.nome} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{g.nome}</p>
              <p className="text-xs text-gray-400">{g.categoria} · {g.ruolo}</p>
            </div>
            <button onClick={() => { setEditIdx(realIdx); setEditVal(g); }}
              className="text-gray-300 hover:text-blue-400 shrink-0">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => rimuovi(g.nome)} className="text-gray-300 hover:text-red-400 shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      <div className="border-t border-gray-100 pt-3 space-y-2">
        <input value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") aggiungi(); }}
          placeholder="Cognome e Nome"
          className={`w-full ${inputCls}`} />
        <div className="flex gap-2">
          <select value={nuovo.categoria} onChange={(e) => setNuovo({ ...nuovo, categoria: e.target.value })}
            className={`${selCls} flex-1`}>
            <option value="">Categoria</option>
            {CATEGORIE.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={nuovo.ruolo} onChange={(e) => setNuovo({ ...nuovo, ruolo: e.target.value })}
            className={`${selCls} flex-1`}>
            <option value="">Ruolo</option>
            {RUOLI_ROSA.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button onClick={aggiungi}
            disabled={!nuovo.nome.trim() || !nuovo.categoria || !nuovo.ruolo}
            className="flex items-center gap-1.5 bg-[#C8102E] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-800 disabled:opacity-40">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ImpostazioniPage() {
  const [form, setForm] = useState<Impostazioni>({
    nomeClub: "", nomeStruttura: "", indirizzo: "", fisioterapisti: [], preparatori: [], rosa: [],
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

        {/* Rosa giocatori */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-1">Rosa giocatori</h2>
          <p className="text-sm text-gray-500 mb-4">
            Aggiungi, modifica o rimuovi i giocatori che appaiono nel form di segnalazione infortuni.
          </p>
          <RosaSection
            rosa={form.rosa}
            onChange={(r) => setForm({ ...form, rosa: r })}
          />
        </div>

        {/* Notifiche push */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-1">Notifiche push</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ricevi una notifica su questo dispositivo quando viene segnalato un nuovo infortunio. Ogni dispositivo va abilitato separatamente.
          </p>
          <NotificheSection />
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

import { supabase } from "./supabase";
import { getDB } from "./db";
import { syncInfortunioAPI, pullPerformanceAthletesMap } from "./performance-sync";

export type Stato = "Infortunato" | "Disponibile";

export const CATEGORIE = ["U19", "U17", "U16", "U15", "U14"] as const;
export type Categoria = (typeof CATEGORIE)[number];

export const PIEDI = ["Destro", "Sinistro", "Ambidestro"] as const;
export type Piede = (typeof PIEDI)[number];

export const TIPI_INFORTUNIO = [
  "Frattura",
  "Altro Infortunio Osseo",
  "Dislocazione/Sublussazione",
  "Distorsione/Lesione Legamentosa",
  "Lesione meniscale o cartilaginea",
  "Muscolare: Strappo/Stiramento/Crampo",
  "Tendineo: Tendinopatia/Lesione/Borsite",
  "Ematoma/Contusione",
  "Abrasione",
  "Vescica",
  "Lacerazione/Taglio",
  "Concussion (with or without loss of consciousness)",
  "Infortunio Nervoso",
  "Infortunio Dentale",
  "Altri infortuni",
  "Malattia",
] as const;
export type TipoInfortunio = (typeof TIPI_INFORTUNIO)[number];

export const EVENTI_INFORTUNIO = ["Partita", "Allenamento"] as const;
export type EventoInfortunio = (typeof EVENTI_INFORTUNIO)[number];

export const MECCANISMI_INFORTUNIO = [
  "Corsa/Sprint",
  "Cambio direzione/Pivot",
  "Tiro",
  "Passaggio/Cross",
  "Dribbling",
  "Salto/atterraggio",
  "Caduta/Tuffo",
  "Stretching",
  "Scivolata",
  "Overuse",
  "Pallonata",
  "Scontro",
  "Colpo di testa",
  "Contrasto subito",
  "Contrasto effettuato",
  "Calciato",
  "Placcato",
  "Sbracciata/Gomitata",
  "Other acute",
] as const;
export type MeccanismoInfortunio = (typeof MECCANISMI_INFORTUNIO)[number];

export const CONTATTI_INFORTUNIO = [
  "Non contatto",
  "Contatto con giocatore",
  "Contatto con attrezzo",
] as const;
export type ContattoInfortunio = (typeof CONTATTI_INFORTUNIO)[number];

export const LATI_INFORTUNIO = ["Destro", "Sinistro", "Bilaterale", "Non applicabile"] as const;
export type LatoInfortunio = (typeof LATI_INFORTUNIO)[number];

export const POSIZIONI_INFORTUNIO = [
  "Testa/Faccia",
  "Collo/Rachide Cervicale",
  "Spalla/Clavicola",
  "Braccio Superiore",
  "Gomito",
  "Avambraccio",
  "Polso",
  "Mano/Dita",
  "Sterno/Coste/Rachide Toracico",
  "Addome",
  "Rachide Lombare/Pelvi/Sacro",
  "Anca/Groin",
  "Coscia",
  "Ginocchio",
  "Gamba inferiore/T.Achille",
  "Caviglia",
  "Piede/Dita Piede",
  "Sistemico",
] as const;
export type PosizioneInfortunio = (typeof POSIZIONI_INFORTUNIO)[number];

export interface InfortunioStorico {
  id: string;
  tipo?: string;
  diagnosi: string;
  inizioRehab: string;
  fineRehab: string;
  note?: string;
}

export interface QuestionarioKinesiofobia {
  id: string;
  data: string;
  risposte: number[];
  punteggio: number;
  infortunioId?: string;
  infortunioLabel?: string;
}

export interface Atleta {
  id: string;
  nome: string;          // nome completo "Cognome Nome" es. "Tonolini Luca" — usato come athlete_name
  nomeCompleto?: string; // legacy: se presente sovrascrive nome nella visualizzazione (rimosso gradualmente)
  dataNascita: string;
  categoria: Categoria;
  posizione: string;
  piedeDominante: Piede;
  tipoInfortunio?: TipoInfortunio;
  evento?: string;
  meccanismo?: string;
  contatto?: string;
  lato?: string;
  posizioneInfortunio?: string;
  infortunio: string;
  inizioRehab: string;
  fineRehab?: string;
  stato: Stato;
  progresso: number;
  fisioterapista: string;
  preparatoreAtletico: string;
  telefono: string;
  email: string;
  note: string;
  storicoInfortuni?: InfortunioStorico[];
  questionariKinesiofobia?: QuestionarioKinesiofobia[];
  // Antropometria
  peso?: string;
  altezza?: string;
  altezzaDaSeduto?: string;
}

// Mirwald et al. (2002) – formula maschi
export function calcolaPHV(
  altezza: string, altezzaDaSeduto: string, peso: string, dataNascita: string
): { offset: number; etaPHV: number } | null {
  const h = parseFloat(altezza);
  const sh = parseFloat(altezzaDaSeduto);
  const w = parseFloat(peso);
  if (!dataNascita || isNaN(h) || isNaN(sh) || isNaN(w) || h <= 0 || sh <= 0 || w <= 0 || sh >= h) return null;
  const eta = (Date.now() - new Date(dataNascita).getTime()) / (365.25 * 864e5);
  const leg = h - sh;
  const offset =
    -9.236
    + 0.0002708 * leg * sh
    - 0.001663  * eta * leg
    + 0.007216  * eta * sh
    + 0.02292   * (w / h) * 100;
  return { offset: Math.round(offset * 100) / 100, etaPHV: Math.round((eta - offset) * 10) / 10 };
}

export interface Esercizio {
  nome: string;
  serie: string;
  reps: string;
  carico: string;
  rir: string;
  vas: string;
  note: string;
}

export const TIPI_ESERCIZIO_CAMPO = [
  "CCVV",
  "Intermittente",
  "Corsa continua",
  "Metabolico",
  "Sprint",
  "COD",
  "Lavoro neuromuscolare",
  "Lavoro tecnico",
  "HSR",
  "RSA",
] as const;
export type TipoEsercizioCampo = (typeof TIPI_ESERCIZIO_CAMPO)[number];

export interface EsercizioCampo {
  tipo: TipoEsercizioCampo | "";
  serie: string;
  durata: string;
  descrizione: string;
}

export const TESTS_PREDEFINITI = [
  // Hop
  "Single Leg Hop Test",
  "Triple Hop Test",
  "Crossover Hop Test",
  "6m Timed Hop Test",
  "Side Hop Test",
  "Broad Jump",
  "Limb Symmetry Index",
  // Balance
  "Y-Balance Test – Anteriore",
  "Y-Balance Test – Posteromediale",
  "Y-Balance Test – Posterolaterale",
  "SEBT",
  // Forza
  "Isokinetic 60°/s",
  "Isokinetic 180°/s",
  "Isokinetic 240°/s",
  "Rapporto H/Q",
  "Forza quadricipite (dinamometro)",
  "Forza hamstring (dinamometro)",
  "Single Leg Press",
  "Heel Rise Test",
  // Salto
  "CMJ – Counter Movement Jump",
  "CMJ braccia libere",
  "SL CMJ",
  "Squat Jump",
  "Drop Jump",
  "SL Drop Jump",
  // ROM
  "Dorsiflexion Lunge Test",
  "ROM ginocchio – flessione",
  "ROM ginocchio – estensione",
  "ROM caviglia – dorsiflessione",
  "ROM anca – flessione",
  // Funzionale
  "Single Leg Squat",
  "FMS",
  // Personalizzato
  "Personalizzato",
] as const;
export type TestPredefinito = (typeof TESTS_PREDEFINITI)[number];

export interface TestFisiometrico {
  nome: string;
  risultatoSx: string;
  risultatoDx: string;
  risultato: string;
  unita: string;
  note: string;
  // Drop Jump
  altezzaSalto?: string;
  tempoContatto?: string;
  rsi?: string;
  // SL Drop Jump (bilaterale)
  altezzaSaltoSx?: string;
  altezzaSaltoDx?: string;
  tempoContattoSx?: string;
  tempoContattoDx?: string;
  rsiSx?: string;
  rsiDx?: string;
}

export interface Carico {
  rpe: string;
  interno: string;
  esterno: string;
  durata: string;
  distanzaTotale: string;
  velocitaMax: string;
  hsr: string;
  accelerazioni: string;
  note: string;
}

export interface Programma {
  id: string;
  atletaId: string;
  nome: string;
  fase: string;
  data: string;
  infortunioId?: string;
  infortunioLabel?: string;
  esercizi: Esercizio[];
  esercizicampo?: EsercizioCampo[];
  tests: TestFisiometrico[];
  carico: Carico;
  assente?: boolean;
  riposo?: boolean;
  noteAssenza?: string;
}

export interface Impostazioni {
  nomeClub: string;
  nomeStruttura: string;
  indirizzo: string;
  fisioterapisti: string[];
  preparatori: string[];
}

const defaultCarico: Carico = {
  rpe: "", interno: "", esterno: "", durata: "", distanzaTotale: "",
  velocitaMax: "", hsr: "", accelerazioni: "", note: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

function rowToAtleta(r: Record<string, unknown>): Atleta {
  return {
    id: r.id as string,
    nome: r.nome as string,
    nomeCompleto: (r.nome_completo as string) || undefined,
    dataNascita: (r.data_nascita as string) ?? "",
    categoria: r.categoria as Categoria,
    posizione: (r.posizione as string) ?? "",
    piedeDominante: (r.piede_dominante as Piede) ?? "Destro",
    tipoInfortunio: (r.tipo_infortunio as TipoInfortunio) ?? undefined,
    evento: (r.evento as string) ?? undefined,
    meccanismo: (r.meccanismo as string) ?? undefined,
    contatto: (r.contatto as string) ?? undefined,
    lato: (r.lato as string) ?? undefined,
    posizioneInfortunio: (r.posizione_infortunio as string) ?? undefined,
    infortunio: (r.infortunio as string) ?? "",
    inizioRehab: (r.inizio_rehab as string) ?? "",
    fineRehab: (r.fine_rehab as string) ?? undefined,
    stato: r.stato as Stato,
    progresso: (r.progresso as number) ?? 0,
    fisioterapista: (r.fisioterapista as string) ?? "",
    preparatoreAtletico: (r.preparatore_atletico as string) ?? "",
    telefono: (r.telefono as string) ?? "",
    email: (r.email as string) ?? "",
    note: (r.note as string) ?? "",
    storicoInfortuni: (r.storico_infortuni as InfortunioStorico[]) ?? [],
    questionariKinesiofobia: (r.questionari_kinesiofobia as QuestionarioKinesiofobia[]) ?? [],
    peso: (r.peso as string) ?? "",
    altezza: (r.altezza as string) ?? "",
    altezzaDaSeduto: (r.altezza_da_seduto as string) ?? "",
  };
}

function atletaToRow(a: Atleta): Record<string, unknown> {
  return {
    id: a.id,
    nome: a.nome,
    data_nascita: a.dataNascita,
    categoria: a.categoria,
    posizione: a.posizione,
    piede_dominante: a.piedeDominante,
    tipo_infortunio: a.tipoInfortunio ?? null,
    evento: a.evento ?? null,
    meccanismo: a.meccanismo ?? null,
    contatto: a.contatto ?? null,
    lato: a.lato ?? null,
    posizione_infortunio: a.posizioneInfortunio ?? null,
    infortunio: a.infortunio,
    inizio_rehab: a.inizioRehab,
    fine_rehab: a.fineRehab ?? null,
    stato: a.stato,
    progresso: a.progresso,
    fisioterapista: a.fisioterapista,
    preparatore_atletico: a.preparatoreAtletico,
    telefono: a.telefono,
    email: a.email,
    note: a.note,
    storico_infortuni: a.storicoInfortuni ?? [],
    questionari_kinesiofobia: a.questionariKinesiofobia ?? [],
    peso: a.peso ?? null,
    altezza: a.altezza ?? null,
    altezza_da_seduto: a.altezzaDaSeduto ?? null,
    nome_completo: a.nomeCompleto ?? null,
  };
}

function rowToProgramma(r: Record<string, unknown>): Programma {
  const noteRaw = r.note_assenza as string | null;
  // riposo encoded in note_assenza with prefix (no separate DB column needed)
  const isRiposo = typeof noteRaw === "string" && noteRaw.startsWith("__riposo__");
  const noteAssenza = isRiposo
    ? (noteRaw.slice("__riposo__".length) || undefined)
    : (noteRaw ?? undefined);
  // Optional fields encoded inside carico JSONB (no separate DB columns needed)
  const caricoRaw = (r.carico as Record<string, unknown>) ?? {};
  const { _esercizicampo, _infortunio_id, _infortunio_label, ...caricoClean } = caricoRaw;
  return {
    id: r.id as string,
    atletaId: r.atleta_id as string,
    nome: r.nome as string,
    fase: (r.fase as string) ?? "",
    data: r.data as string,
    // read from carico._* first, fall back to top-level columns for backward compat
    infortunioId: (_infortunio_id as string) ?? (r.infortunio_id as string) ?? undefined,
    infortunioLabel: (_infortunio_label as string) ?? (r.infortunio_label as string) ?? undefined,
    esercizi: (r.esercizi as Esercizio[]) ?? [],
    esercizicampo: (_esercizicampo as EsercizioCampo[]) ?? (r.esercizicampo as EsercizioCampo[]) ?? [],
    tests: (r.tests as TestFisiometrico[]) ?? [],
    carico: caricoClean as unknown as Carico,
    assente: !isRiposo && ((r.assente as boolean) ?? false),
    riposo: isRiposo,
    noteAssenza,
  };
}

function programmaToRow(p: Programma): Record<string, unknown> {
  // riposo encoded in note_assenza with prefix (no separate DB column needed)
  const note_assenza = p.riposo
    ? "__riposo__" + (p.noteAssenza ?? "")
    : (p.noteAssenza ?? null);
  // Optional fields encoded inside carico JSONB to avoid schema dependency
  const caricoExtended: Record<string, unknown> = { ...(p.carico as unknown as Record<string, unknown>) };
  if (p.esercizicampo?.length) caricoExtended._esercizicampo = p.esercizicampo;
  if (p.infortunioId) {
    caricoExtended._infortunio_id = p.infortunioId;
    if (p.infortunioLabel) caricoExtended._infortunio_label = p.infortunioLabel;
  }
  return {
    id: p.id,
    atleta_id: p.atletaId,
    nome: p.nome,
    fase: p.fase,
    data: p.data,
    esercizi: p.esercizi,
    tests: p.tests,
    carico: caricoExtended,
    assente: p.assente ?? false,
    note_assenza,
  };
}

// ─── Sync flush ──────────────────────────────────────────────────────────────

export async function syncFlush(): Promise<void> {
  if (!isOnline()) return;
  const db = getDB();
  const ops = await db.pendingOps.orderBy("id").toArray();
  for (const op of ops) {
    let ok = false;
    try {
      if (op.table === "atleti") {
        if (op.op === "upsert") {
          const { error } = await supabase.from("atleti").upsert(op.payload as Record<string, unknown>);
          ok = !error;
        } else {
          await supabase.from("atleti").delete().eq("id", (op.payload as { id: string }).id);
          ok = true;
        }
      } else if (op.table === "programmi") {
        if (op.op === "upsert") {
          const safePayload = programmaToRow(rowToProgramma(op.payload as Record<string, unknown>));
          const { error } = await supabase.from("programmi").upsert(safePayload);
          if (error) console.error("[syncFlush] programmi upsert", error.code, error.message);
          ok = !error;
        } else {
          await supabase.from("programmi").delete().eq("id", (op.payload as { id: string }).id);
          ok = true;
        }
      } else if (op.table === "impostazioni") {
        await supabase.from("impostazioni").upsert(op.payload as Record<string, unknown>);
        ok = true;
      }
    } catch {}
    if (ok && op.id != null) await db.pendingOps.delete(op.id);
  }
}

// ─── Force-push all local data to Supabase ──────────────────────────────────

export async function pushAllLocalToSupabase(): Promise<{ ok: number; fail: number }> {
  if (!isOnline()) return { ok: 0, fail: 0 };
  const db = getDB();
  let ok = 0; let fail = 0;

  // Atleti
  const atleti = await db.atleti.toArray();
  for (const a of atleti) {
    try {
      const { error } = await supabase.from("atleti").upsert(atletaToRow(a));
      if (!error) ok++; else { console.error("[pushAll] atleta", a.id, error.message); fail++; }
    } catch (e) { console.error("[pushAll] atleta exception", e); fail++; }
  }

  // Programmi
  const programmi = await db.programmi.toArray();
  for (const p of programmi) {
    try {
      const { error } = await supabase.from("programmi").upsert(programmaToRow(p));
      if (!error) ok++; else { console.error("[pushAll] programma", p.id, error.message); fail++; }
    } catch (e) { console.error("[pushAll] programma exception", e); fail++; }
  }

  // Clear pendingOps after successful push
  if (fail === 0) await db.pendingOps.clear();

  return { ok, fail };
}

// ─── Atleti ─────────────────────────────────────────────────────────────────

export async function loadAtleti(): Promise<Atleta[]> {
  const db = getDB();
  if (isOnline()) {
    try {
      const [sbResult, perfMap] = await Promise.all([
        supabase.from("atleti").select("*").order("created_at", { ascending: true }),
        pullPerformanceAthletesMap().catch(() => new Map()),
      ]);
      if (!sbResult.error && sbResult.data) {
        const atleti = sbResult.data.map(rowToAtleta).map(a => {
          const perf = perfMap.get(a.nome);
          if (!perf) return a;
          return {
            ...a,
            dataNascita: a.dataNascita || perf.birth_date || a.dataNascita,
            nomeCompleto: perf.full_name || a.nomeCompleto,
          };
        });
        await db.atleti.bulkPut(atleti);
        // Persisti data di nascita importata su Supabase (fire-and-forget)
        for (const a of atleti) {
          const orig = sbResult.data.find(r => r.id === a.id);
          if (!orig?.data_nascita && a.dataNascita) {
            supabase.from("atleti").update({ data_nascita: a.dataNascita }).eq("id", a.id).then(() => {});
          }
        }
        return atleti;
      }
    } catch {}
  }
  return db.atleti.toArray();
}

export async function upsertAtleta(a: Atleta): Promise<void> {
  const db = getDB();
  await db.atleti.put(a);
  await db.pendingOps.add({ table: "atleti", op: "upsert", payload: atletaToRow(a), createdAt: Date.now() });
  if (isOnline()) syncFlush().then(() => syncInfortunioAPI(a)).catch(() => {});
}

export async function deleteAtleta(id: string): Promise<void> {
  const db = getDB();
  await db.atleti.delete(id);
  await db.pendingOps.add({ table: "atleti", op: "delete", payload: { id }, createdAt: Date.now() });
  if (isOnline()) syncFlush().catch(() => {});
}

// ─── Programmi ──────────────────────────────────────────────────────────────

export async function loadProgrammi(atletaId?: string): Promise<Programma[]> {
  const db = getDB();
  if (isOnline()) {
    try {
      let q = supabase
        .from("programmi")
        .select("*");
      if (atletaId) q = q.eq("atleta_id", atletaId);
      const { data, error } = await q;
      if (error) {
        console.error("[loadProgrammi] supabase error", atletaId, error.message, error.code, error.details);
      } else if (data) {
        const fromSupabase = data.map(rowToProgramma);
        await db.programmi.bulkPut(fromSupabase);
        // Merge with local-only records not yet synced to Supabase
        const supabaseIds = new Set(fromSupabase.map(p => p.id));
        const allLocal = atletaId
          ? await db.programmi.where("atletaId").equals(atletaId).toArray()
          : await db.programmi.toArray();
        const localOnly = allLocal.filter(p => !supabaseIds.has(p.id));
        return [...fromSupabase, ...localOnly].sort((a, b) => a.data.localeCompare(b.data));
      }
    } catch (e) {
      console.error("[loadProgrammi] exception", atletaId, e);
    }
  }
  if (atletaId) {
    return db.programmi.where("atletaId").equals(atletaId).toArray();
  }
  return db.programmi.toArray();
}

export async function upsertProgramma(p: Programma): Promise<void> {
  const db = getDB();
  await db.programmi.put(p);
  await db.pendingOps.add({ table: "programmi", op: "upsert", payload: programmaToRow(p), createdAt: Date.now() });
  if (isOnline()) syncFlush().catch(() => {});
}

export async function deleteProgramma(id: string): Promise<void> {
  const db = getDB();
  await db.programmi.delete(id);
  await db.pendingOps.add({ table: "programmi", op: "delete", payload: { id }, createdAt: Date.now() });
  if (isOnline()) syncFlush().catch(() => {});
}

// ─── Realtime subscriptions ──────────────────────────────────────────────────

export function subscribeToAtleti(onChange: () => void): () => void {
  const channel = supabase
    .channel(`atleti-rt-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "atleti" }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeToProgrammi(onChange: (atletaId?: string) => void): () => void {
  const channel = supabase
    .channel(`programmi-rt-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "programmi" },
      (payload) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
        onChange(row?.atleta_id as string | undefined);
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ─── Impostazioni ────────────────────────────────────────────────────────────

const defaultImpostazioni: Impostazioni = {
  nomeClub: "U.S. Cremonese",
  nomeStruttura: "Rehab Area",
  indirizzo: "",
  fisioterapisti: [],
  preparatori: [],
};

export async function loadImpostazioni(): Promise<Impostazioni> {
  const db = getDB();
  if (isOnline()) {
    try {
      const { data } = await supabase
        .from("impostazioni")
        .select("*")
        .eq("id", 1)
        .single();
      if (data) {
        const imp: Impostazioni = {
          nomeClub: (data.nome_club as string) ?? "U.S. Cremonese",
          nomeStruttura: (data.nome_struttura as string) ?? "Rehab Area",
          indirizzo: (data.indirizzo as string) ?? "",
          fisioterapisti: (data.fisioterapisti as string[]) ?? [],
          preparatori: (data.preparatori as string[]) ?? [],
        };
        await db.impostazioni.put({ ...imp, id: 1 });
        return imp;
      }
    } catch {}
  }
  const local = await db.impostazioni.get(1);
  if (local) {
    const { id: _id, ...imp } = local;
    return imp;
  }
  return { ...defaultImpostazioni };
}

export async function saveImpostazioni(s: Impostazioni): Promise<void> {
  const db = getDB();
  await db.impostazioni.put({ ...s, id: 1 });
  const row = {
    id: 1,
    nome_club: s.nomeClub,
    nome_struttura: s.nomeStruttura,
    indirizzo: s.indirizzo,
    fisioterapisti: s.fisioterapisti,
    preparatori: s.preparatori,
  };
  if (isOnline()) {
    try {
      await supabase.from("impostazioni").upsert(row);
      return;
    } catch {}
  }
  await db.pendingOps.add({ table: "impostazioni", op: "upsert", payload: row, createdAt: Date.now() });
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Nome visualizzabile: usa nomeCompleto se disponibile, altrimenti il codice */
export function nd(a: Pick<Atleta, "nome" | "nomeCompleto">): string {
  return a.nomeCompleto || a.nome;
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

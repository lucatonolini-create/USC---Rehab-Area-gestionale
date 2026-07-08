import { supabase } from "./supabase";
import { getDB } from "./db";
import { syncInfortunioAPI } from "./performance-sync";

export type Stato = "Infortunato" | "Disponibile";

export const CATEGORIE = ["Primavera", "U17", "U16", "U15", "U14"] as const;
export type Categoria = (typeof CATEGORIE)[number];

export const PIEDI = ["Destro", "Sinistro", "Ambidestro"] as const;
export type Piede = (typeof PIEDI)[number];

export const TIPI_INFORTUNIO = [
  "Muscolare",
  "Art. - Leg. - Cart.",
  "Tendineo",
  "Osseo",
  "Cutaneo",
  "Concussion",
  "Altro",
] as const;
export type TipoInfortunio = (typeof TIPI_INFORTUNIO)[number];

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
  nome: string;
  dataNascita: string;
  categoria: Categoria;
  posizione: string;
  piedeDominante: Piede;
  tipoInfortunio?: TipoInfortunio;
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
    dataNascita: (r.data_nascita as string) ?? "",
    categoria: r.categoria as Categoria,
    posizione: (r.posizione as string) ?? "",
    piedeDominante: (r.piede_dominante as Piede) ?? "Destro",
    tipoInfortunio: (r.tipo_infortunio as TipoInfortunio) ?? undefined,
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
  };
}

function rowToProgramma(r: Record<string, unknown>): Programma {
  return {
    id: r.id as string,
    atletaId: r.atleta_id as string,
    nome: r.nome as string,
    fase: (r.fase as string) ?? "",
    data: r.data as string,
    infortunioId: (r.infortunio_id as string) ?? undefined,
    infortunioLabel: (r.infortunio_label as string) ?? undefined,
    esercizi: (r.esercizi as Esercizio[]) ?? [],
    esercizicampo: (r.esercizicampo as EsercizioCampo[]) ?? [],
    tests: (r.tests as TestFisiometrico[]) ?? [],
    carico: (r.carico as Carico) ?? { ...defaultCarico },
  };
}

function programmaToRow(p: Programma): Record<string, unknown> {
  return {
    id: p.id,
    atleta_id: p.atletaId,
    nome: p.nome,
    fase: p.fase,
    data: p.data,
    infortunio_id: p.infortunioId ?? null,
    infortunio_label: p.infortunioLabel ?? null,
    esercizi: p.esercizi,
    esercizicampo: p.esercizicampo ?? [],
    tests: p.tests,
    carico: p.carico,
  };
}

// ─── Sync flush ──────────────────────────────────────────────────────────────

export async function syncFlush(): Promise<void> {
  if (!isOnline()) return;
  const db = getDB();
  const ops = await db.pendingOps.orderBy("createdAt").toArray();
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
          await supabase.from("programmi").upsert(op.payload as Record<string, unknown>);
          ok = true;
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

// ─── Atleti ─────────────────────────────────────────────────────────────────

export async function loadAtleti(): Promise<Atleta[]> {
  const db = getDB();
  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from("atleti")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data) {
        const atleti = data.map(rowToAtleta);
        await db.atleti.bulkPut(atleti);
        return atleti;
      }
    } catch {}
  }
  return db.atleti.toArray();
}

export async function upsertAtleta(a: Atleta): Promise<void> {
  const db = getDB();
  await db.atleti.put(a);
  if (isOnline()) {
    try {
      const { error } = await supabase.from("atleti").upsert(atletaToRow(a));
      if (!error) {
        syncInfortunioAPI(a).catch(() => {});
        return;
      }
    } catch {}
  }
  await db.pendingOps.add({ table: "atleti", op: "upsert", payload: atletaToRow(a), createdAt: Date.now() });
}

export async function deleteAtleta(id: string): Promise<void> {
  const db = getDB();
  await db.atleti.delete(id);
  if (isOnline()) {
    try {
      await supabase.from("atleti").delete().eq("id", id);
      return;
    } catch {}
  }
  await db.pendingOps.add({ table: "atleti", op: "delete", payload: { id }, createdAt: Date.now() });
}

// ─── Programmi ──────────────────────────────────────────────────────────────

export async function loadProgrammi(atletaId?: string): Promise<Programma[]> {
  const db = getDB();
  if (isOnline()) {
    try {
      let q = supabase
        .from("programmi")
        .select("*")
        .order("created_at", { ascending: true });
      if (atletaId) q = q.eq("atleta_id", atletaId);
      const { data, error } = await q;
      if (!error && data) {
        const programmi = data.map(rowToProgramma);
        await db.programmi.bulkPut(programmi);
        return programmi;
      }
    } catch {}
  }
  if (atletaId) {
    return db.programmi.where("atletaId").equals(atletaId).toArray();
  }
  return db.programmi.toArray();
}

export async function upsertProgramma(p: Programma): Promise<void> {
  const db = getDB();
  await db.programmi.put(p);
  if (isOnline()) {
    try {
      await supabase.from("programmi").upsert(programmaToRow(p));
      return;
    } catch {}
  }
  await db.pendingOps.add({ table: "programmi", op: "upsert", payload: programmaToRow(p), createdAt: Date.now() });
}

export async function deleteProgramma(id: string): Promise<void> {
  const db = getDB();
  await db.programmi.delete(id);
  if (isOnline()) {
    try {
      await supabase.from("programmi").delete().eq("id", id);
      return;
    } catch {}
  }
  await db.pendingOps.add({ table: "programmi", op: "delete", payload: { id }, createdAt: Date.now() });
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

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

import { supabase } from "./supabase";

export type Stato = "In recupero" | "Quasi guarito" | "Guarito";

export const CATEGORIE = ["Primavera", "U17", "U16", "U15", "U14"] as const;
export type Categoria = (typeof CATEGORIE)[number];

export const PIEDI = ["Destro", "Sinistro", "Ambidestro"] as const;
export type Piede = (typeof PIEDI)[number];

export const TIPI_INFORTUNIO = [
  "Muscolare",
  "Articolare - Legamentoso - Cartilagineo",
  "Tendineo",
  "Osseo",
  "Cutaneo",
  "Concussion",
  "Altro",
] as const;
export type TipoInfortunio = (typeof TIPI_INFORTUNIO)[number];

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
  rpe: string;
  vas: string;
  note: string;
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
  esercizi: Esercizio[];
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
  interno: "", esterno: "", durata: "", distanzaTotale: "",
  velocitaMax: "", hsr: "", accelerazioni: "", note: "",
};

// ─── Mapping helpers ────────────────────────────────────────────────────────

function rowToAtleta(r: Record<string, any>): Atleta {
  return {
    id: r.id,
    nome: r.nome,
    dataNascita: r.data_nascita ?? "",
    categoria: r.categoria,
    posizione: r.posizione ?? "",
    piedeDominante: r.piede_dominante ?? "Destro",
    tipoInfortunio: r.tipo_infortunio ?? undefined,
    infortunio: r.infortunio ?? "",
    inizioRehab: r.inizio_rehab ?? "",
    fineRehab: r.fine_rehab ?? undefined,
    stato: r.stato,
    progresso: r.progresso ?? 0,
    fisioterapista: r.fisioterapista ?? "",
    preparatoreAtletico: r.preparatore_atletico ?? "",
    telefono: r.telefono ?? "",
    email: r.email ?? "",
    note: r.note ?? "",
    peso: r.peso ?? "",
    altezza: r.altezza ?? "",
    altezzaDaSeduto: r.altezza_da_seduto ?? "",
  };
}

function atletaToRow(a: Atleta): Record<string, any> {
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
    peso: a.peso ?? null,
    altezza: a.altezza ?? null,
    altezza_da_seduto: a.altezzaDaSeduto ?? null,
  };
}

function rowToProgramma(r: Record<string, any>): Programma {
  return {
    id: r.id,
    atletaId: r.atleta_id,
    nome: r.nome,
    fase: r.fase ?? "",
    data: r.data,
    esercizi: r.esercizi ?? [],
    tests: r.tests ?? [],
    carico: r.carico ?? { ...defaultCarico },
  };
}

function programmaToRow(p: Programma): Record<string, any> {
  return {
    id: p.id,
    atleta_id: p.atletaId,
    nome: p.nome,
    fase: p.fase,
    data: p.data,
    esercizi: p.esercizi,
    tests: p.tests,
    carico: p.carico,
  };
}

// ─── Atleti ─────────────────────────────────────────────────────────────────

export async function loadAtleti(): Promise<Atleta[]> {
  const { data, error } = await supabase
    .from("atleti")
    .select("*")
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map(rowToAtleta);
}

export async function upsertAtleta(a: Atleta): Promise<void> {
  const { error } = await supabase.from("atleti").upsert(atletaToRow(a));
  if (error) throw new Error(error.message);
}

export async function deleteAtleta(id: string): Promise<void> {
  await supabase.from("atleti").delete().eq("id", id);
}

// ─── Programmi ──────────────────────────────────────────────────────────────

export async function loadProgrammi(atletaId?: string): Promise<Programma[]> {
  let q = supabase
    .from("programmi")
    .select("*")
    .order("created_at", { ascending: true });
  if (atletaId) q = q.eq("atleta_id", atletaId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(rowToProgramma);
}

export async function upsertProgramma(p: Programma): Promise<void> {
  await supabase.from("programmi").upsert(programmaToRow(p));
}

export async function deleteProgramma(id: string): Promise<void> {
  await supabase.from("programmi").delete().eq("id", id);
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
  const { data } = await supabase
    .from("impostazioni")
    .select("*")
    .eq("id", 1)
    .single();
  if (!data) return { ...defaultImpostazioni };
  return {
    nomeClub: data.nome_club ?? "U.S. Cremonese",
    nomeStruttura: data.nome_struttura ?? "Rehab Area",
    indirizzo: data.indirizzo ?? "",
    fisioterapisti: data.fisioterapisti ?? [],
    preparatori: data.preparatori ?? [],
  };
}

export async function saveImpostazioni(s: Impostazioni): Promise<void> {
  await supabase.from("impostazioni").upsert({
    id: 1,
    nome_club: s.nomeClub,
    nome_struttura: s.nomeStruttura,
    indirizzo: s.indirizzo,
    fisioterapisti: s.fisioterapisti,
    preparatori: s.preparatori,
  });
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

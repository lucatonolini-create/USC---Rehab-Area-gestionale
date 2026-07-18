import { supabase } from "./supabase";
import { getDB } from "./db";

export type Stato = "Infortunato" | "Disponibile";

export const CATEGORIE = ["U19", "U17", "U16", "U15", "U14"] as const;
export type Categoria = (typeof CATEGORIE)[number];

export const PIEDI = ["Ambidestro", "Destro", "Sinistro"] as const;

export const OBIETTIVI_PALESTRA = [
  "Accessori",
  "Compound",
  "Controllo motorio",
  "Core",
  "Forza esplosiva",
  "Forza massima",
  "Forza strutturale",
  "Isometrie",
  "Metabolico",
  "Pliometria estensiva",
  "Pliometria intensiva",
  "Potenza",
] as const;

export const OBIETTIVI_CAMPO = [
  "Accelerazioni/Decelerazioni",
  "HSR",
  "Lavoro tecnico",
  "Metabolico",
  "Neuromuscolare",
  "RSA",
  "Sprint",
] as const;
export type Piede = (typeof PIEDI)[number];

export const TIPI_INFORTUNIO = [
  "Abrasione",
  "Altri infortuni",
  "Altro Infortunio Osseo",
  "Concussion (with or without loss of consciousness)",
  "Dislocazione/Sublussazione",
  "Distorsione/Lesione Legamentosa",
  "Ematoma/Contusione",
  "Frattura",
  "Infortunio Dentale",
  "Infortunio Nervoso",
  "Lacerazione/Taglio",
  "Lesione meniscale o cartilaginea",
  "Malattia",
  "Muscolare: Strappo/Stiramento/Crampo",
  "Tendineo: Tendinopatia/Lesione/Borsite",
  "Vescica",
] as const;
export type TipoInfortunio = (typeof TIPI_INFORTUNIO)[number];

export const EVENTI_INFORTUNIO = ["Allenamento", "Partita"] as const;
export type EventoInfortunio = (typeof EVENTI_INFORTUNIO)[number];

export const MECCANISMI_INFORTUNIO = [
  "Caduta/Tuffo",
  "Calciato",
  "Cambio direzione/Pivot",
  "Colpo di testa",
  "Contrasto effettuato",
  "Contrasto subito",
  "Corsa/Sprint",
  "Dribbling",
  "Other acute",
  "Overuse",
  "Pallonata",
  "Passaggio/Cross",
  "Placcato",
  "Salto/atterraggio",
  "Sbracciata/Gomitata",
  "Scivolata",
  "Scontro",
  "Stretching",
  "Tiro",
] as const;
export type MeccanismoInfortunio = (typeof MECCANISMI_INFORTUNIO)[number];

export const CONTATTI_INFORTUNIO = [
  "Contatto con attrezzo",
  "Contatto con giocatore",
  "Non contatto",
] as const;
export type ContattoInfortunio = (typeof CONTATTI_INFORTUNIO)[number];

export const LATI_INFORTUNIO = ["Bilaterale", "Destro", "Non applicabile", "Sinistro"] as const;
export type LatoInfortunio = (typeof LATI_INFORTUNIO)[number];

export const POSIZIONI_INFORTUNIO = [
  "Addome",
  "Anca/Groin",
  "Avambraccio",
  "Braccio Superiore",
  "Caviglia",
  "Collo/Rachide Cervicale",
  "Coscia",
  "Gamba inferiore/T.Achille",
  "Ginocchio",
  "Gomito",
  "Mano/Dita",
  "Piede/Dita Piede",
  "Polso",
  "Rachide Lombare/Pelvi/Sacro",
  "Sistemico",
  "Spalla/Clavicola",
  "Sterno/Coste/Rachide Toracico",
  "Testa/Faccia",
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

export type TipoReferto = "Ecografia" | "Risonanza Magnetica" | "TAC" | "Radiografia" | "Visita clinica" | "Altro";
export type EsitoReferto = "Positivo" | "In miglioramento" | "Negativo";
export const TIPI_REFERTO: TipoReferto[] = ["Altro", "Ecografia", "Radiografia", "Risonanza Magnetica", "TAC", "Visita clinica"];
export const ESITI_REFERTO: EsitoReferto[] = ["In miglioramento", "Negativo", "Positivo"];

export interface RefertoClinico {
  id: string;
  data: string;
  tipo: TipoReferto;
  esito: EsitoReferto;
  note?: string;
}

export interface Atleta {
  id: string;
  nome: string;          // nome completo "Cognome Nome" es. "Tonolini Luca" — usato come athlete_name
  nomeCompleto?: string; // legacy: se presente sovrascrive nome nella visualizzazione (rimosso gradualmente)
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
  progressoManuale?: number;  // se impostato, sovrascrive il calcolo automatico
  refertiClinici?: RefertoClinico[];
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
}

// Tempi di recupero standard per tipo di infortunio (in giorni)
export const RECOVERY_DAYS: Partial<Record<TipoInfortunio, number>> = {
  "Frattura": 84,
  "Altro Infortunio Osseo": 56,
  "Dislocazione/Sublussazione": 42,
  "Distorsione/Lesione Legamentosa": 42,
  "Lesione meniscale o cartilaginea": 84,
  "Muscolare: Strappo/Stiramento/Crampo": 21,
  "Tendineo: Tendinopatia/Lesione/Borsite": 56,
  "Ematoma/Contusione": 14,
  "Abrasione": 7,
  "Vescica": 7,
  "Lacerazione/Taglio": 14,
  "Concussion (with or without loss of consciousness)": 21,
  "Infortunio Nervoso": 56,
  "Infortunio Dentale": 14,
  "Altri infortuni": 28,
  "Malattia": 14,
};

export function calcolaProgressoAuto(
  atleta: Pick<Atleta, "stato" | "inizioRehab" | "tipoInfortunio" | "refertiClinici">
): number {
  if (atleta.stato === "Disponibile") return 100;
  if (!atleta.inizioRehab) return 0;
  const giorni = Math.max(0, Math.floor(
    (Date.now() - new Date(atleta.inizioRehab + "T12:00").getTime()) / 864e5
  ));
  const expectedDays = (atleta.tipoInfortunio ? RECOVERY_DAYS[atleta.tipoInfortunio] : undefined) ?? 42;
  let base = Math.min(95, Math.floor((giorni / expectedDays) * 100));
  const referti = [...(atleta.refertiClinici ?? [])].sort((a, b) => b.data.localeCompare(a.data));
  if (referti.length > 0) {
    if (referti[0].esito === "Negativo") base = Math.min(base, 40);
    else if (referti[0].esito === "In miglioramento") base = Math.min(base, 70);
  }
  return Math.max(0, base);
}

function progrEffettivo(a: Atleta): number {
  return a.progressoManuale !== undefined ? a.progressoManuale : calcolaProgressoAuto(a);
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
  tipo: string;
  serie: string;
  durata: string;
  descrizione: string;
  vas: string;
}

export const TESTS_PREDEFINITI = [
  "6m Timed Hop Test",
  "Broad Jump",
  "CMJ braccia libere",
  "CMJ – Counter Movement Jump",
  "Crossover Hop Test",
  "Dorsiflexion Lunge Test",
  "Drop Jump",
  "FMS",
  "Forza hamstring (dinamometro)",
  "Forza quadricipite (dinamometro)",
  "Heel Rise Test",
  "Isokinetic 60°/s",
  "Isokinetic 180°/s",
  "Isokinetic 240°/s",
  "Limb Symmetry Index",
  "Rapporto H/Q",
  "ROM anca – flessione",
  "ROM caviglia – dorsiflessione",
  "ROM ginocchio – estensione",
  "ROM ginocchio – flessione",
  "SEBT",
  "Side Hop Test",
  "Single Leg Hop Test",
  "Single Leg Press",
  "Single Leg Squat",
  "SL CMJ",
  "SL Drop Jump",
  "Squat Jump",
  "Triple Hop Test",
  "Y-Balance Test – Anteriore",
  "Y-Balance Test – Posterolaterale",
  "Y-Balance Test – Posteromediale",
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
  esterno?: string;
  durata: string;
  distanzaTotale: string;
  velocitaMax: string;
  hsr: string;
  velocita21?: string;
  velocita25?: string;
  accelerazioni: string;
  decelerazioni?: string;
  sprint?: string;
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
  obiettiviPalestra?: string[];
  obiettiviCampo?: string[];
  tests: TestFisiometrico[];
  carico: Carico;
  assente?: boolean;
  riposo?: boolean;
  squadra?: boolean;
  noteAssenza?: string;
}

export interface GiocatoreRosa {
  nome: string;
  categoria: string;
  ruolo: string;
}

export interface Impostazioni {
  nomeClub: string;
  nomeStruttura: string;
  indirizzo: string;
  fisioterapisti: string[];
  preparatori: string[];
  rosa: GiocatoreRosa[];
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
    refertiClinici: (r.referti_clinici as RefertoClinico[]) ?? [],
    progressoManuale: (r.progresso_manuale !== null && r.progresso_manuale !== undefined)
      ? (r.progresso_manuale as number) : undefined,
    peso: (r.peso as string) ?? "",
    altezza: (r.altezza as string) ?? "",
  };
}

function atletaToRow(a: Atleta): Record<string, unknown> {
  return {
    id: a.id,
    nome: a.nome,
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
    referti_clinici: a.refertiClinici ?? [],
    progresso_manuale: a.progressoManuale ?? null,
    peso: a.peso ?? null,
    altezza: a.altezza ?? null,
    nome_completo: a.nomeCompleto ?? null,
  };
}

function rowToProgramma(r: Record<string, unknown>): Programma {
  // All optional fields live in carico JSONB with _ prefix to avoid schema dependency
  const caricoRaw = (r.carico as Record<string, unknown>) ?? {};
  const {
    _esercizicampo, _infortunio_id, _infortunio_label,
    _riposo, _assente, _squadra, _note_assenza,
    _obiettivi_palestra, _obiettivi_campo,
    ...caricoClean
  } = caricoRaw;

  // Backward compat: note_assenza was once a top-level column with __riposo__/__assente__ prefixes
  const noteRaw = r.note_assenza as string | null;
  const legacyRiposo  = typeof noteRaw === "string" && noteRaw.startsWith("__riposo__");
  const legacyAssente = !legacyRiposo && typeof noteRaw === "string" && noteRaw.startsWith("__assente__");
  const legacyNote = legacyRiposo
    ? (noteRaw.slice("__riposo__".length) || undefined)
    : legacyAssente
    ? (noteRaw.slice("__assente__".length) || undefined)
    : (noteRaw ?? undefined);

  const isRiposo  = !!_riposo  || legacyRiposo;
  const isAssente = !!_assente || legacyAssente || (!_riposo && !legacyRiposo && ((r.assente as boolean) ?? false));
  const isSquadra = !!_squadra;
  const noteAssenza = (_note_assenza as string | undefined) ?? legacyNote;

  return {
    id: r.id as string,
    atletaId: r.atleta_id as string,
    nome: r.nome as string,
    fase: (r.fase as string) ?? "",
    data: r.data as string,
    infortunioId: (_infortunio_id as string) ?? (r.infortunio_id as string) ?? undefined,
    infortunioLabel: (_infortunio_label as string) ?? (r.infortunio_label as string) ?? undefined,
    esercizi: (r.esercizi as Esercizio[]) ?? [],
    esercizicampo: (_esercizicampo as EsercizioCampo[]) ?? (r.esercizicampo as EsercizioCampo[]) ?? [],
    obiettiviPalestra: (_obiettivi_palestra as string[]) ?? [],
    obiettiviCampo: (_obiettivi_campo as string[]) ?? [],
    tests: (r.tests as TestFisiometrico[]) ?? [],
    carico: caricoClean as unknown as Carico,
    assente: isAssente,
    riposo: isRiposo,
    squadra: isSquadra,
    noteAssenza,
  };
}

function programmaToRow(p: Programma): Record<string, unknown> {
  // All optional fields encoded in carico JSONB to avoid schema dependency
  const caricoExtended: Record<string, unknown> = { ...(p.carico as unknown as Record<string, unknown>) };
  if (p.esercizicampo?.length) caricoExtended._esercizicampo = p.esercizicampo;
  if (p.obiettiviPalestra?.length) caricoExtended._obiettivi_palestra = p.obiettiviPalestra;
  if (p.obiettiviCampo?.length) caricoExtended._obiettivi_campo = p.obiettiviCampo;
  if (p.infortunioId) {
    caricoExtended._infortunio_id = p.infortunioId;
    if (p.infortunioLabel) caricoExtended._infortunio_label = p.infortunioLabel;
  }
  if (p.riposo)      caricoExtended._riposo       = true;
  if (p.assente)     caricoExtended._assente      = true;
  if (p.squadra)     caricoExtended._squadra      = true;
  if (p.noteAssenza) caricoExtended._note_assenza = p.noteAssenza;
  return {
    id: p.id,
    atleta_id: p.atletaId,
    nome: p.nome,
    fase: p.fase,
    data: p.data,
    esercizi: p.esercizi,
    tests: p.tests,
    carico: caricoExtended,
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
          const row = op.payload as Record<string, unknown>;
          const { error } = await supabase.from("atleti").upsert(row);
          if (!error) {
            ok = true;
          } else if (error.code === "PGRST204") {
            const { referti_clinici, progresso_manuale, peso, altezza, nome_completo, ...safeRow } = row;
            const { error: e2 } = await supabase.from("atleti").upsert(safeRow);
            ok = !e2 || isExpectedSyncError(e2.code);
          } else {
            ok = isExpectedSyncError(error.code);
          }
        } else {
          await supabase.from("atleti").delete().eq("id", (op.payload as { id: string }).id);
          ok = true;
        }
      } else if (op.table === "programmi") {
        if (op.op === "upsert") {
          const safePayload = programmaToRow(rowToProgramma(op.payload as Record<string, unknown>));
          const { error } = await supabase.from("programmi").upsert(safePayload);
          if (error && !isExpectedSyncError(error.code)) console.error("[syncFlush] programmi upsert", error.code, error.message);
          ok = !error || isExpectedSyncError(error.code);
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

// Error codes that are "expected" and should not count as failures
function isExpectedSyncError(code: string | undefined): boolean {
  return code === "23503" // FK violation (orphaned record)
    || code === "23505"   // duplicate key (already synced)
    || code === "PGRST116"; // row not found on delete
}

export async function pushAllLocalToSupabase(): Promise<{ ok: number; fail: number; lastError: string }> {
  if (!isOnline()) return { ok: 0, fail: 0, lastError: "Dispositivo offline" };
  const db = getDB();
  let ok = 0; let fail = 0; let lastError = "";

  // Atleti
  const atleti = await db.atleti.toArray();
  for (const a of atleti) {
    try {
      const row = atletaToRow(a);
      const { error } = await supabase.from("atleti").upsert(row);
      if (!error) {
        ok++;
      } else if (error.code === "PGRST204") {
        // Some optional columns may not exist yet — retry without them
        const { referti_clinici, progresso_manuale, peso, altezza, nome_completo, ...safeRow } = row;
        const { error: e2 } = await supabase.from("atleti").upsert(safeRow);
        if (!e2 || isExpectedSyncError(e2.code)) ok++;
        else { lastError = `atleti: ${e2.code} ${e2.message}`; fail++; }
      } else if (isExpectedSyncError(error.code)) {
        ok++; // treat expected errors as success
      } else {
        lastError = `atleti: ${error.code} ${error.message}`; console.error("[pushAll] atleta", error); fail++;
      }
    } catch (e) { lastError = `atleti exception: ${e}`; fail++; }
  }

  // Fetch valid atleta IDs from Supabase to avoid FK violations on programmi
  const { data: atletiSb } = await supabase.from("atleti").select("id");
  const atletiSbIds = new Set((atletiSb ?? []).map((r: { id: string }) => r.id));

  // Clean up local orphaned programmi (athlete deleted everywhere)
  const localAtletiIds = new Set(atleti.map(a => a.id));
  const programmi = await db.programmi.toArray();
  const orfani = programmi.filter(p => !localAtletiIds.has(p.atletaId));
  if (orfani.length > 0) {
    await db.programmi.bulkDelete(orfani.map(p => p.id));
  }

  // Sync only programmi whose athlete exists in Supabase
  for (const p of programmi) {
    if (!atletiSbIds.has(p.atletaId)) continue;
    try {
      const { error } = await supabase.from("programmi").upsert(programmaToRow(p));
      if (!error || isExpectedSyncError(error.code)) ok++;
      else { lastError = `programmi: ${error.code} ${error.message}`; console.error("[pushAll] programma", error); fail++; }
    } catch (e) { lastError = `programmi exception: ${e}`; fail++; }
  }

  if (fail === 0) await db.pendingOps.clear();

  return { ok, fail, lastError };
}

// ─── Atleti ─────────────────────────────────────────────────────────────────

export async function loadAtleti(): Promise<Atleta[]> {
  const db = getDB();
  if (isOnline()) {
    try {
      const sbResult = await supabase.from("atleti").select("*").order("created_at", { ascending: true });
      if (!sbResult.error && sbResult.data) {
        // Merge with local to preserve IndexedDB-only fields (refertiClinici, progressoManuale)
        // in case Supabase columns don't exist yet
        const localAll = await db.atleti.toArray();
        const localMap = new Map(localAll.map(a => [a.id, a]));
        const atleti = sbResult.data.map(rowToAtleta).map(a => {
          const local = localMap.get(a.id);
          return {
            ...a,
            refertiClinici: (a.refertiClinici && a.refertiClinici.length > 0)
              ? a.refertiClinici : (local?.refertiClinici ?? []),
            progressoManuale: a.progressoManuale ?? local?.progressoManuale,
          };
        }).map(a => ({ ...a, progresso: progrEffettivo(a) }));
        await db.atleti.bulkPut(atleti);
        return atleti;
      }
    } catch {}
  }
  return (await db.atleti.toArray()).map(a => ({ ...a, progresso: progrEffettivo(a) }));
}

export async function upsertAtleta(a: Atleta): Promise<void> {
  const db = getDB();
  const toSave = { ...a, progresso: progrEffettivo(a) };
  await db.atleti.put(toSave);
  await db.pendingOps.add({ table: "atleti", op: "upsert", payload: atletaToRow(toSave), createdAt: Date.now() });
  if (isOnline()) syncFlush().catch(() => {});
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

export function subscribeToIntakeInsert(onNew: (nome: string, categoria: string) => void): () => void {
  const channel = supabase
    .channel("intake-notify")
    .on("broadcast", { event: "new" }, (payload: { payload: { nome: string; categoria: string } }) => {
      onNew(payload.payload?.nome ?? "Atleta", payload.payload?.categoria ?? "");
    })
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
  rosa: [],
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
          rosa: (data.rosa as GiocatoreRosa[]) ?? [],
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
    rosa: s.rosa,
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

// ─── Epidemiologia Mensile ────────────────────────────────────────────────────

export interface EpiMonthlyEntry {
  data: string;        // YYYY-MM-DD
  atleta: string;
  presente: boolean;
  minutaggio?: number; // training minutes
  rpe?: number;        // 1-10
}

export interface EpiMonthlyRecord {
  id: string;          // `${categoria}-${anno}-${mese}`
  categoria: Categoria;
  anno: number;
  mese: number;        // 1-12
  uploadedAt: string;
  entries: EpiMonthlyEntry[];
}

export async function loadEpiMonthly(): Promise<EpiMonthlyRecord[]> {
  const db = getDB();
  return db.epiMonthly.toArray();
}

export async function upsertEpiMonthly(record: EpiMonthlyRecord): Promise<void> {
  const db = getDB();
  await db.epiMonthly.put(record);
}

export async function deleteEpiMonthly(id: string): Promise<void> {
  const db = getDB();
  await db.epiMonthly.delete(id);
}

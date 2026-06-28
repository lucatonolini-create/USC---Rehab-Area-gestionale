"use client";

export type Stato = "In recupero" | "Quasi guarito" | "Guarito";

export const CATEGORIE = ["Primavera", "U17", "U16", "U15", "U14"] as const;
export type Categoria = (typeof CATEGORIE)[number];

export const PIEDI = ["Destro", "Sinistro", "Ambidestro"] as const;
export type Piede = (typeof PIEDI)[number];

export interface Atleta {
  id: string;
  nome: string;
  dataNascita: string;
  categoria: Categoria;
  posizione: string;
  piedeDominante: Piede;
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
}

export interface Esercizio {
  nome: string;
  serie: string;
  reps: string;
  rpe: string;
  vas: string;
  note: string;
}

export interface TestFisiometrico {
  nome: string;
  risultato: string;
  unita: string;
  note: string;
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

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

const defaultCarico: Carico = {
  interno: "", esterno: "", durata: "", distanzaTotale: "",
  velocitaMax: "", hsr: "", accelerazioni: "", note: "",
};

export function loadAtleti(): Atleta[] {
  return load<Atleta[]>("usc_atleti", []);
}
export function saveAtleti(a: Atleta[]) {
  localStorage.setItem("usc_atleti", JSON.stringify(a));
}

export function loadProgrammi(): Programma[] {
  const raw = load<any[]>("usc_programmi", []);
  return raw.map((p) => ({
    ...p,
    tests: p.tests ?? [],
    carico: p.carico ?? { ...defaultCarico },
  }));
}
export function saveProgrammi(p: Programma[]) {
  localStorage.setItem("usc_programmi", JSON.stringify(p));
}

export function loadImpostazioni(): Impostazioni {
  return load<Impostazioni>("usc_impostazioni", {
    nomeClub: "USC Cremonese",
    nomeStruttura: "Rehab Area",
    indirizzo: "",
    fisioterapisti: [],
    preparatori: [],
  });
}
export function saveImpostazioni(s: Impostazioni) {
  localStorage.setItem("usc_impostazioni", JSON.stringify(s));
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

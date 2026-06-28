"use client";

export type Stato = "In recupero" | "Quasi guarito" | "Critico" | "Guarito";

export const CATEGORIE = ["Primavera", "U19", "U18", "U17", "U16", "U15", "U14"] as const;
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

export interface Programma {
  id: string;
  atletaId: string;
  nome: string;
  fase: string;
  data: string;
  esercizi: Esercizio[];
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

export function loadAtleti(): Atleta[] {
  return load<Atleta[]>("usc_atleti", []);
}
export function saveAtleti(a: Atleta[]) {
  localStorage.setItem("usc_atleti", JSON.stringify(a));
}

export function loadProgrammi(): Programma[] {
  return load<Programma[]>("usc_programmi", []);
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

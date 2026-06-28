"use client";

export type Stato = "In recupero" | "Quasi guarito" | "Critico" | "Guarito";

export interface Atleta {
  id: string;
  nome: string;
  eta: string;
  posizione: string;
  infortunio: string;
  inizioRehab: string;
  stato: Stato;
  progresso: number;
  fisioterapista: string;
  telefono: string;
  email: string;
  note: string;
}

export interface Appuntamento {
  id: string;
  atletaId: string;
  data: string;
  ora: string;
  tipo: string;
  durata: string;
  stanza: string;
  stato: "programmato" | "in corso" | "completato";
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

export function saveAtleti(atleti: Atleta[]) {
  localStorage.setItem("usc_atleti", JSON.stringify(atleti));
}

export function loadAppuntamenti(): Appuntamento[] {
  return load<Appuntamento[]>("usc_appuntamenti", []);
}

export function saveAppuntamenti(app: Appuntamento[]) {
  localStorage.setItem("usc_appuntamenti", JSON.stringify(app));
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

"use client";

import { useState, useRef, useEffect } from "react";
import { ROSA, type Giocatore } from "@/lib/players";

interface Props {
  value: string;
  onSelect: (nome: string, giocatore?: Giocatore) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function PlayerCombobox({ value, onSelect, placeholder = "Cerca giocatore…", required, className }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<Giocatore[]>(ROSA);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data) && data.length > 0) setPlayers(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q ? players.filter((g) => g.nome.toLowerCase().includes(q)) : players;
  const exactMatch = players.some((g) => g.nome.toLowerCase() === q);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white"
      />

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {filtered.map((g) => (
            <button key={g.nome} type="button"
              onMouseDown={() => { onSelect(g.nome, g); setQuery(g.nome); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between gap-3">
              <span className="font-medium text-gray-900">{g.nome}</span>
              <span className="text-xs text-gray-400 shrink-0">{g.categoria} · {g.ruolo}</span>
            </button>
          ))}

          {!exactMatch && query.trim() && (
            <button type="button"
              onMouseDown={() => { onSelect(query.trim()); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#C8102E] hover:bg-red-50 flex items-center gap-2 border-t border-gray-100">
              <span>+</span>
              <span>Aggiungi &ldquo;{query.trim()}&rdquo; (non in lista)</span>
            </button>
          )}

          {filtered.length === 0 && !query.trim() && (
            <p className="px-4 py-3 text-sm text-gray-400 text-center">Nessun risultato</p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { searchOsiicsCodes, type OsiicsCode } from "@/lib/store";

interface Props {
  value?: { id: string; codice: string; descrizioneIta: string } | null;
  onChange: (code: OsiicsCode | null) => void;
}

export default function OsiicsCombobox({ value, onChange }: Props) {
  const [query, setQuery] = useState(value ? `${value.codice} — ${value.descrizioneIta}` : "");
  const [results, setResults] = useState<OsiicsCode[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback((q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      const codes = await searchOsiicsCodes(q);
      setResults(codes);
      setOpen(codes.length > 0);
      setLoading(false);
    }, 280);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keep input text in sync when value changes externally (e.g. form reset)
  useEffect(() => {
    if (!value) setQuery("");
    else setQuery(`${value.codice} — ${value.descrizioneIta}`);
  }, [value?.id]);

  const select = (code: OsiicsCode) => {
    setQuery(`${code.codice} — ${code.descrizioneIta}`);
    setOpen(false);
    setResults([]);
    onChange(code);
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onChange(null);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-1">
        <input
          type="text"
          value={query}
          placeholder="Cerca codice o diagnosi…"
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (!v) { onChange(null); }
            search(v);
          }}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] bg-white"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            className="shrink-0 px-3 text-gray-400 hover:text-gray-700 border border-gray-200 rounded-xl text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {loading && (
        <p className="absolute left-0 right-0 top-full mt-1 text-xs text-gray-400 px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-lg z-50">
          Ricerca in corso…
        </p>
      )}

      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
          {results.map((code) => (
            <li key={code.id}>
              <button
                type="button"
                onMouseDown={() => select(code)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-start gap-3 group"
              >
                <span className="font-mono font-bold text-blue-700 text-sm shrink-0 bg-blue-100 px-2 py-0.5 rounded-md group-hover:bg-blue-200 min-w-[3rem] text-center">
                  {code.codice}
                </span>
                <span className="text-sm text-gray-800 leading-snug">
                  {code.descrizioneIta}
                  {code.descrizioneEng && code.descrizioneEng !== code.descrizioneIta && (
                    <span className="block text-xs text-gray-400">{code.descrizioneEng}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-1 text-[10px] text-gray-400 leading-relaxed">
        Classificazione basata su OSIICS v15 — Orchard et al., Journal of Sport and Health Science, 2024
      </p>
    </div>
  );
}

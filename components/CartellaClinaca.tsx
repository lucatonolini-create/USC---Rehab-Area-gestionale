"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, FileText, Image, Trash2, ExternalLink, FolderOpen, CheckCircle2 } from "lucide-react";
import { caricaDocs, salvaDoc, eliminaDoc, formatBytes, type DocMedico } from "@/lib/filestore";
import { uid } from "@/lib/store";

const TIPI_ACCETTATI = "image/*,application/pdf";

function IconaFile({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <Image className="w-5 h-5 text-blue-500" />;
  return <FileText className="w-5 h-5 text-red-500" />;
}

interface Props {
  atletaId: string;
}

export default function CartellaClinaca({ atletaId }: Props) {
  const [docs, setDocs] = useState<DocMedico[]>([]);
  const [caricando, setCaricando] = useState(false);
  const [appenaCaricati, setAppenaCaricati] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileListRef = useRef<HTMLDivElement>(null);

  const carica = async () => {
    const lista = await caricaDocs(atletaId);
    setDocs(lista.sort((a, b) => b.dataCaricamento.localeCompare(a.dataCaricamento)));
  };

  useEffect(() => { carica(); }, [atletaId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setCaricando(true);
    const nuoviIds: string[] = [];
    for (const file of Array.from(files)) {
      const id = uid();
      nuoviIds.push(id);
      await salvaDoc({
        id,
        atletaId,
        nome: file.name,
        mimeType: file.type,
        dataCaricamento: new Date().toISOString(),
        dimensione: file.size,
        blob: file,
      });
    }
    await carica();
    setCaricando(false);
    setAppenaCaricati(nuoviIds);
    // Scroll alla lista file e rimuovi highlight dopo 2s
    setTimeout(() => {
      fileListRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
    setTimeout(() => setAppenaCaricati([]), 2500);
  };

  const apri = (doc: DocMedico) => {
    const url = URL.createObjectURL(doc.blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const elimina = async (id: string) => {
    await eliminaDoc(id);
    await carica();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-5">

      {/* ── Documenti allegati ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Documenti allegati{docs.length > 0 ? ` (${docs.length})` : ""}
          </p>
          {caricando && (
            <span className="text-[10px] text-gray-400 animate-pulse">Caricamento…</span>
          )}
          {!caricando && appenaCaricati.length > 0 && (
            <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Salvato
            </span>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-[#C8102E] hover:bg-red-50/30 transition-all"
        >
          <input
            ref={inputRef}
            type="file"
            accept={TIPI_ACCETTATI}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Upload className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
          <p className="text-sm font-medium text-gray-500">
            Trascina qui o clicca per caricare
          </p>
          <p className="text-xs text-gray-300 mt-0.5">PDF, immagini (ecografie, RMN, referti…)</p>
        </div>

        {/* Lista file */}
        {docs.length === 0 ? (
          <div className="text-center py-5">
            <FolderOpen className="w-8 h-8 text-gray-200 mx-auto mb-1.5" />
            <p className="text-xs text-gray-400">Nessun documento caricato</p>
          </div>
        ) : (
          <div className="space-y-2 mt-3" ref={fileListRef}>
            {docs.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors duration-700 ${
                  appenaCaricati.includes(doc.id)
                    ? "bg-green-50 border border-green-200"
                    : "bg-gray-50"
                }`}
              >
                <IconaFile mimeType={doc.mimeType} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.nome}</p>
                  <p className="text-xs text-gray-400">
                    {formatBytes(doc.dimensione)} · {new Date(doc.dataCaricamento).toLocaleDateString("it-IT")}
                  </p>
                </div>
                <button onClick={() => apri(doc)} title="Apri"
                  className="text-gray-400 hover:text-[#C8102E] transition-colors shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button onClick={() => elimina(doc.id)} title="Elimina"
                  className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

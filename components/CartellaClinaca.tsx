"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, FileText, Image, Trash2, ExternalLink, FolderOpen } from "lucide-react";
import { caricaDocs, salvaDoc, eliminaDoc, formatBytes, type DocMedico } from "@/lib/filestore";
import { uid } from "@/lib/store";

const TIPI_ACCETTATI = "image/*,application/pdf";

function IconaFile({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <Image className="w-5 h-5 text-blue-500" />;
  return <FileText className="w-5 h-5 text-red-500" />;
}

export default function CartellaClinaca({ atletaId }: { atletaId: string }) {
  const [docs, setDocs] = useState<DocMedico[]>([]);
  const [caricando, setCaricando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const carica = async () => {
    const lista = await caricaDocs(atletaId);
    setDocs(lista.sort((a, b) => b.dataCaricamento.localeCompare(a.dataCaricamento)));
  };

  useEffect(() => { carica(); }, [atletaId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setCaricando(true);
    for (const file of Array.from(files)) {
      await salvaDoc({
        id: uid(),
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
    <div>
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#C8102E] hover:bg-red-50/30 transition-all mb-4"
      >
        <input
          ref={inputRef}
          type="file"
          accept={TIPI_ACCETTATI}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-500">
          {caricando ? "Caricamento in corso..." : "Trascina qui o clicca per caricare"}
        </p>
        <p className="text-xs text-gray-300 mt-1">PDF, immagini (ecografie, RMN, referti…)</p>
      </div>

      {/* Lista documenti */}
      {docs.length === 0 ? (
        <div className="text-center py-6">
          <FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nessun documento caricato</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <IconaFile mimeType={doc.mimeType} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.nome}</p>
                <p className="text-xs text-gray-400">
                  {formatBytes(doc.dimensione)} · {new Date(doc.dataCaricamento).toLocaleDateString("it-IT")}
                </p>
              </div>
              <button onClick={() => apri(doc)} title="Apri"
                className="text-gray-400 hover:text-[#C8102E] transition-colors">
                <ExternalLink className="w-4 h-4" />
              </button>
              <button onClick={() => elimina(doc.id)} title="Elimina"
                className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

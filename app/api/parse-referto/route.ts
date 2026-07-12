import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const TIPI_REFERTO = ["Ecografia", "Risonanza Magnetica", "Radiografia", "Visita clinica", "Altro"] as const;
const ESITI_REFERTO = ["Positivo", "Nella norma", "Miglioramento parziale", "Negativo"] as const;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File mancante" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mediaType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";

  const prompt = `Sei un assistente medico sportivo. Analizza questo documento medico (referto, ecografia, risonanza, ecc.) e estrai le seguenti informazioni in formato JSON:

- data: la data del referto nel formato YYYY-MM-DD. Se non trovi una data precisa usa la data di oggi (${new Date().toISOString().slice(0, 10)}).
- tipo: il tipo di esame. Scegli ESATTAMENTE uno di questi valori: ${TIPI_REFERTO.join(", ")}.
- esito: l'esito/risultato clinico. Scegli ESATTAMENTE uno di questi valori: ${ESITI_REFERTO.join(", ")}. Se il referto indica lesione, patologia attiva o risultato anormale usa "Negativo". Se indica guarigione o miglioramento parziale usa i valori corrispondenti.
- note: un riassunto clinico conciso (max 2 righe) delle informazioni più importanti trovate nel documento: struttura anatomica coinvolta, grado della lesione, dettagli diagnostici rilevanti.

Rispondi SOLO con un oggetto JSON valido, nessun testo aggiuntivo. Esempio:
{"data":"2026-07-12","tipo":"Ecografia","esito":"Nella norma","note":"Lesione I grado muscolo semitendinoso destro. Edema lieve, struttura parzialmente conservata."}`;

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            mediaType === "application/pdf"
              ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
              : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Risposta non valida da Claude" }, { status: 500 });

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and sanitize
    const result = {
      data: typeof parsed.data === "string" ? parsed.data : new Date().toISOString().slice(0, 10),
      tipo: TIPI_REFERTO.includes(parsed.tipo) ? parsed.tipo : "Altro",
      esito: ESITI_REFERTO.includes(parsed.esito) ? parsed.esito : "Nella norma",
      note: typeof parsed.note === "string" ? parsed.note.slice(0, 500) : "",
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("parse-referto error:", err);
    return NextResponse.json({ error: "Errore analisi documento" }, { status: 500 });
  }
}

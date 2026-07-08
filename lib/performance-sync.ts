// Client-side — chiama il proxy /api/performance/injuries (mai l'API esterna direttamente)
import type { Atleta } from "./store";

const TIPO_MAP: Record<string, string> = {
  "Muscolare":           "muscolare",
  "Art. - Leg. - Cart.": "articolare",
  "Tendineo":            "tendineo",
  "Osseo":               "osseo",
  "Cutaneo":             "cutaneo",
  "Concussion":          "concussion",
  "Altro":               "altro",
};

// Severity derivata dal tipo, aggiornabile in futuro con campo dedicato
const SEVERITY_MAP: Record<string, string> = {
  "Muscolare":           "moderato",
  "Art. - Leg. - Cart.": "moderato",
  "Tendineo":            "moderato",
  "Osseo":               "grave",
  "Cutaneo":             "lieve",
  "Concussion":          "grave",
  "Altro":               "lieve",
};

function statoToStatus(a: Atleta): string {
  if (a.stato === "Disponibile") return "disponibile";
  return a.progresso > 15 ? "rehab" : "infortunato";
}

export async function syncInfortunioAPI(a: Atleta): Promise<void> {
  // Invia solo se c'è un infortunio attivo o se l'atleta è appena guarito
  if (!a.infortunio && a.stato !== "Disponibile") return;

  const body: Record<string, unknown> = {
    external_id:     a.id,
    athlete_code:    a.nome,                                           // es. "Lu.To.98_Primavera"
    date:            a.inizioRehab || new Date().toISOString().slice(0, 10),
    type:            a.tipoInfortunio ? (TIPO_MAP[a.tipoInfortunio] ?? "altro") : "altro",
    body_part:       a.infortunio || "",
    severity:        a.tipoInfortunio ? (SEVERITY_MAP[a.tipoInfortunio] ?? "moderato") : "moderato",
    status:          statoToStatus(a),
    expected_return: a.fineRehab || undefined,
    notes:           a.note || undefined,
  };

  try {
    const res = await fetch("/api/performance/injuries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("[perfSync] POST /injuries failed:", res.status, err);
      return;
    }

    const data = await res.json();
    if (data.resolved_athlete_id === null) {
      console.warn("[perfSync] atleta non trovato nella rosa:", a.nome);
    }
  } catch (e) {
    // Non bloccare il salvataggio locale se il sync fallisce
    console.warn("[perfSync] network error:", e);
  }
}

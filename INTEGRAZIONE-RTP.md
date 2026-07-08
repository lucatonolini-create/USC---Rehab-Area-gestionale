# Integrazione RTP ↔️ Cremonese U17 Performance

> **Documento per il Claude dello sviluppatore RTP.** Leggilo tutto prima di scrivere codice.

## ⚠️ Leggi prima questo — architettura (non fraintendere)

Esistono **due app separate**:

1. **Cremonese U17 Performance** = **il SERVER**. Espone già tutti gli endpoint qui
   sotto, sono **online e funzionanti** su `https://cremonese-app.vercel.app/api/v1/`.
   **NON devi implementarli tu, non devi ricrearli, non devi esporre nulla.**
2. **App RTP (la tua)** = **il CLIENT**. Il tuo unico compito è **fare chiamate HTTP**
   verso gli URL del server:
   - **GET** per **leggere** i dati dei ragazzi (atleti, gps, rpe, wellness, test, calendario, partite, carico).
   - **POST** per **inviare** al server gli infortuni e le sedute di riabilitazione.

Il server **non "invia" e non "chiama" mai** la tua app: sei tu che leggi (GET) e
scrivi (POST) su di lui. Quindi:

- ❌ NON creare gli endpoint `/rehab-sessions`, `/load-status`, `/injuries`, ecc. dentro la tua app.
- ✅ Fai richieste HTTP a quegli endpoint **sul server** (`https://cremonese-app.vercel.app/api/v1/...`).

---

## Autenticazione

- Base URL: `https://cremonese-app.vercel.app/api/v1`
- Header obbligatorio in **ogni** richiesta: `x-api-key: <API_KEY>`
- Metti la chiave in una **variabile d'ambiente** (es. `CREMONESE_API_KEY`), lato server. Mai nel frontend, mai in commit.
- Formato: JSON. Date `YYYY-MM-DD`.

## Collegamento dei giocatori

Per riferirti a un giocatore usa, in ordine di priorità:
1. `athlete_id` (uuid preso da `GET /athletes`) — match sicuro.
2. `athlete_name` = **nome completo "Cognome Nome"** (es. `"Fraccaroli Elia"`) — abbinamento per cognome/nome.

> **NON usare sigle/codici** (es. `Fr.El.10_U17`): non vengono riconosciuti e le voci restano scollegate. Usa il **nome completo** o l'`athlete_id`.

Se la risposta di un POST ha `resolved_athlete_id: null`, il nome non è stato trovato in rosa → segnalalo (il giocatore va prima inserito nell'app della squadra).

---

## LETTURA — chiamate GET (leggi i dati dei ragazzi)

Tutte accettano i parametri opzionali `?from=YYYY-MM-DD&to=YYYY-MM-DD&athlete_id=<uuid>`.
Ogni riga include `athlete_id` e `athlete_name`.

| Endpoint | Contenuto |
|---|---|
| `GET /athletes` | Anagrafica: `id, name, position, role_detail, birth_date, jersey_number, vmax_kmh, preferred_foot, weight_kg, height_cm` |
| `GET /gps` | `date, session_type, total_distance_m, distance_hsr_m, distance_vhsr_m, distance_sprint_m, accelerations, decelerations, metabolic_energy` |
| `GET /rpe` | `session, rpe, duration_min, srpe` |
| `GET /wellness` | `cmj_height_cm, body_weight_kg, energy, fatigue, sleep_hours, sleep_quality` |
| `GET /tests` | `{ jump, sprint, drop_jump, ift }` |
| `GET /sessions` | Calendario: `date, title, session_type, duration_min, md_label, competition, matchday, tournament` |
| `GET /matches` | Report partita con, per atleta: `minutes, subentrato, sostituito, total_distance_m, distance_hsr_m, distance_vhsr_m, distance_sprint_m` |
| `GET /load-status?athlete_id=` | Monitoraggio carico: `weekly_load, chronic_weekly, acwr, monotony, strain, sessions_7d, flag (ok\|warn\|risk)` |

---

## SCRITTURA — chiamate POST (invii i tuoi dati al server)

### `POST /injuries` — infortuni
Chiama a ogni creazione/modifica di un infortunio. Upsert per `external_id` (reinviare lo stesso id **aggiorna**, non duplica).
```json
{
  "external_id": "<id_infortunio_nel_TUO_db>",
  "athlete_name": "Fraccaroli Elia",       // oppure "athlete_id" (uuid)
  "date": "2026-03-05",
  "type": "muscolare",
  "body_part": "ischiocrurali dx",
  "severity": "moderato",                    // lieve | moderato | grave
  "status": "rehab",                         // infortunato | rehab | disponibile
  "expected_return": "2026-03-20",
  "differentiated": "corsa lineare 60% + core",
  "notes": "..."
}
```

### `POST /rehab-sessions` — sedute di riabilitazione / differenziato
Chiama a ogni seduta. Upsert per `external_id`. `srpe` calcolato come `rpe × duration_min` se non fornito.
```json
{
  "external_id": "<id_seduta_nel_TUO_db>",
  "athlete_name": "Fraccaroli Elia",       // oppure "athlete_id" (uuid)
  "date": "2026-03-06",
  "phase": "campo individuale",             // palestra | campo individuale | parziale col gruppo | ...
  "type": "corsa + cambi direzione",
  "duration_min": 45,
  "rpe": 5,
  "body_part": "ischiocrurali dx",
  "description": "corsa lineare 70% + COD progressivi",
  "notes": "nessun dolore"
}
```
Risposta OK dei POST: `201 { "ok": true, "id": "uuid", "resolved_athlete_id": "uuid" }`.
Per rileggere: `GET /injuries?status=&athlete_id=` · `GET /rehab-sessions?from=&to=&athlete_id=`.

---

## Esempio (Node/JS — adatta al tuo stack)

```js
const BASE = "https://cremonese-app.vercel.app/api/v1";
const H = { "x-api-key": process.env.CREMONESE_API_KEY, "Content-Type": "application/json" };

// LEGGERE: gps di marzo
const gps = await fetch(`${BASE}/gps?from=2026-03-01&to=2026-03-31`, { headers: H }).then(r => r.json());

// LEGGERE: stato di carico di un atleta
const load = await fetch(`${BASE}/load-status?athlete_id=<uuid>`, { headers: H }).then(r => r.json());

// INVIARE: un infortunio (collegamento per nome completo)
await fetch(`${BASE}/injuries`, {
  method: "POST", headers: H,
  body: JSON.stringify({
    external_id: "INJ-142", athlete_name: "Fraccaroli Elia",
    date: "2026-03-05", type: "muscolare", body_part: "ischiocrurali dx",
    severity: "moderato", status: "rehab", expected_return: "2026-03-20"
  })
});

// INVIARE: una seduta rehab
await fetch(`${BASE}/rehab-sessions`, {
  method: "POST", headers: H,
  body: JSON.stringify({
    external_id: "REHAB-87", athlete_name: "Fraccaroli Elia",
    date: "2026-03-06", phase: "campo individuale", type: "corsa + COD",
    duration_min: 45, rpe: 5, body_part: "ischiocrurali dx"
  })
});
```

## Gestione errori
- `401` chiave errata/mancante · `400` body non valido o atleta non indicato · `503` funzione non ancora attiva lato server (avvisa lo staff) · `500` errore server (ritenta con backoff).

## Cosa deve fare il tuo Claude
Crea un **modulo/servizio client** riutilizzabile nella tua app che:
1. tiene la chiave in env e imposta l'header `x-api-key` su ogni richiesta;
2. **legge** dai GET (athletes, gps, rpe, wellness, tests, sessions, matches, load-status) e mostra i dati nella tua UI;
3. **invia** con `POST /injuries` e `POST /rehab-sessions` a ogni salvataggio, usando il tuo id come `external_id` e il **nome completo** come `athlete_name`.

**Non** creare endpoint tuoi, **non** esporre API: il server è già l'altra app. Fai solo le chiamate HTTP.

# Integrazione USC Rehab Area ↔ Cremonese U17 Performance

Documento da condividere con il ragazzo che gestisce l'app Performance per configurare l'integrazione bidirezionale.

---

Devo integrare la mia applicazione (gestionale per fisioterapista/RTP di una squadra di calcio) con l'API REST di un'altra app ("Cremonese U17 Performance"). Lo scambio è bidirezionale: la mia app **legge** i dati dei giocatori e **invia** infortuni e sedute di riabilitazione. Implementa il codice nel linguaggio/framework della mia app (chiedimi qual è se non lo deduci), con le chiamate **lato server** e la chiave in una variabile d'ambiente.

## Dettagli API

- Base URL: `https://cremonese-app.vercel.app/api/v1`
- Autenticazione: header `x-api-key: <API_KEY>` in ogni richiesta (metti `<API_KEY>` in env, es. `CREMONESE_API_KEY`; il valore reale me lo dà lo staff).
- Formato: JSON. Date `YYYY-MM-DD`.

## Chiave di collegamento — la SIGLA (`code`)

Ogni giocatore ha una sigla univoca, formato `<2 lettere nome>.<2 lettere cognome>.<2 cifre anno>_<categoria>`, es. **`Lu.To.08_U17`**. È il modo consigliato per riferirsi ai giocatori in tutti gli endpoint.

---

## 1) Mappatura giocatori — fai prima questa

`GET /athletes` → `{ count, athletes: [...] }`. Ogni giocatore include:
`id, name, code, position (GK/DEF/MID/ATT), role_detail, birth_date, jersey_number, vmax_kmh, preferred_foot, weight_kg, height_cm`.

Salva la mappatura `code ↔️ mio giocatore` e mostra anche i campi anagrafici/fisici nella scheda.

## 2) Lettura dati (GET, con `?from=YYYY-MM-DD&to=...&athlete_id=<uuid>` opzionali)

Ogni riga include `athlete_id`, `athlete_name` e `athlete_code`.

| Endpoint | Dati principali |
|---|---|
| `GET /gps` | `date, session_type, total_distance_m, distance_hsr_m, distance_vhsr_m, distance_sprint_m, accelerations, decelerations, metabolic_energy` |
| `GET /rpe` | `session, rpe, duration_min, srpe` |
| `GET /wellness` | `cmj_height_cm, body_weight_kg, energy, fatigue, sleep_hours, sleep_quality` |
| `GET /tests` | `{ jump, sprint, drop_jump, ift }` |
| `GET /sessions` | `date, title, session_type, duration_min, md_label, competition, matchday, tournament` |
| `GET /matches` | per atleta: `minutes, subentrato, sostituito, total_distance_m, distance_hsr_m, distance_vhsr_m, distance_sprint_m` |
| `GET /load-status?athlete_id=` | `weekly_load, chronic_weekly, acwr, monotony, strain, sessions_7d, flag (ok/warn/risk)` |

## 3) Invio INFORTUNI (POST)

`POST /injuries` a ogni creazione/modifica. Upsert per `external_id` (ri-invio dello stesso id = aggiorna, non duplica).

```json
{
  "external_id": "<id_infortunio_nel_MIO_db>",
  "athlete_code": "Lu.To.08_U17",
  "date": "2026-03-05",
  "type": "muscolare",
  "body_part": "ischiocrurali dx",
  "severity": "moderato",
  "status": "rehab",
  "expected_return": "2026-03-20",
  "differentiated": "corsa lineare 60% + core",
  "notes": "..."
}
```

Valori `severity`: `lieve | moderato | grave`
Valori `status`: `infortunato | rehab | disponibile`

## 4) Invio SEDUTE REHAB / differenziato (POST)

`POST /rehab-sessions` per ogni seduta. Upsert per `external_id`. `srpe` calcolato come `rpe × duration_min` se non fornito.

```json
{
  "external_id": "<id_seduta_nel_MIO_db>",
  "athlete_code": "Lu.To.08_U17",
  "date": "2026-03-06",
  "phase": "campo individuale",
  "type": "corsa + cambi direzione",
  "duration_min": 45,
  "rpe": 5,
  "body_part": "ischiocrurali dx",
  "description": "corsa lineare 70% + COD progressivi",
  "notes": "nessun dolore"
}
```

Valori `phase`: `palestra | campo individuale | parziale col gruppo | ...`

Rilettura per verifica: `GET /rehab-sessions?from=&to=&athlete_id=` · `GET /injuries?status=&athlete_id=`.

## Identificazione giocatore (per tutti i POST)

In ordine di priorità:
1. `athlete_code` (consigliato, match 100%)
2. `athlete_id` (uuid da `/athletes`)
3. `athlete_name` ("Cognome Nome", match fuzzy)

Se la risposta ha `resolved_athlete_id: null`, la sigla/nome non è in rosa → segnalalo.

## Gestione errori

| Codice | Significato |
|---|---|
| `401` | Chiave API errata |
| `400` | Body o atleta mancante |
| `503` | Funzione non ancora attiva lato server (avvisa lo staff) |
| `500` | Errore server (ritenta con backoff) |

## Richiesta

Crea un modulo/servizio riutilizzabile con:
- **(a)** client autenticato
- **(b)** sincronizzazione che invia `POST /injuries` e `POST /rehab-sessions` a ogni salvataggio, usando il mio id come `external_id` e la sigla come `athlete_code`
- **(c)** funzioni di lettura per athletes/gps/rpe/wellness/tests/sessions/matches/load-status da mostrare nella mia UI

Fammi le domande necessarie sul mio stack prima di scrivere il codice.

---

> **Promemoria:** fornisci la chiave API reale separatamente, non in questo documento.
> Il collegamento funziona solo per giocatori già presenti nella rosa dell'app Performance.

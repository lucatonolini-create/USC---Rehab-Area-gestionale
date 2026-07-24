#!/usr/bin/env python3
"""
Importa i codici OSIICS v15 dal file Excel ufficiale in Supabase.

Uso:
  pip install openpyxl requests
  python scripts/seed_osiics.py --file /percorso/OSIICS_v15.xlsx \
      --url https://<PROJECT>.supabase.co \
      --key <SERVICE_ROLE_KEY>

Il file Excel deve essere scaricato da:
  https://www.johnorchard.com/osiics-downloads.html

Attribuzione obbligatoria:
  Classificazione basata su OSIICS v15 — Orchard et al.,
  Journal of Sport and Health Science, 2024
"""

import argparse
import json
import sys
import uuid

try:
    import openpyxl
except ImportError:
    sys.exit("Installa openpyxl: pip install openpyxl")

try:
    import requests
except ImportError:
    sys.exit("Installa requests: pip install requests")

# Mappa primo carattere → regione anatomica
REGIONI = {
    "H": "Testa/Collo", "S": "Spalla/Braccio", "E": "Gomito/Avambraccio",
    "W": "Polso/Mano", "C": "Colonna cervicale", "T": "Colonna toracica",
    "L": "Colonna lombare", "P": "Pelvi/Anca", "K": "Ginocchio",
    "A": "Caviglia/Piede", "Q": "Coscia", "G": "Gamba/Polpaccio",
    "X": "Torace/Addome", "I": "Malattia/Illness", "O": "Altro",
    "M": "Regione muscolare (generico)", "F": "Piede",
}

# Mappa secondo carattere → categoria patologia
CATEGORIE = {
    "M": "Lesione muscolare/Stiramento", "T": "Tendinopatia/Lesione tendinea",
    "F": "Frattura", "L": "Lesione legamentosa", "D": "Dislocazione/Sublussazione",
    "C": "Contusione", "N": "Lesione nervosa", "B": "Lesione ossea (non frattura)",
    "S": "Cute/Lacerazione", "R": "Lesione cartilaginea/meniscale",
    "X": "Concussione/Trauma cranico", "I": "Infezione/Malattia",
    "O": "Altro tessuto molle", "W": "Sovraccarico/Overuse",
    "J": "Articolare (generico)", "G": "Generale",
}


def parse_args():
    p = argparse.ArgumentParser(description="Seed OSIICS v15 codes into Supabase")
    p.add_argument("--file", required=True, help="Percorso del file Excel OSIICS v15")
    p.add_argument("--url", required=True, help="URL del progetto Supabase (es. https://xyz.supabase.co)")
    p.add_argument("--key", required=True, help="Supabase service role key")
    p.add_argument("--sheet", default=None, help="Nome foglio Excel (default: primo foglio)")
    p.add_argument("--col-codice", type=int, default=0, help="Indice colonna codice (0-based, default 0)")
    p.add_argument("--col-eng", type=int, default=1, help="Indice colonna descrizione inglese (default 1)")
    p.add_argument("--col-ita", type=int, default=2, help="Indice colonna descrizione italiana (default 2)")
    p.add_argument("--skip-rows", type=int, default=1, help="Righe da saltare in testa (default 1 = intestazione)")
    p.add_argument("--dry-run", action="store_true", help="Stampa i record senza caricarli")
    return p.parse_args()


def load_excel(path, sheet_name, col_codice, col_eng, col_ita, skip_rows):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[sheet_name] if sheet_name else wb.active
    records = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i < skip_rows:
            continue
        try:
            codice = str(row[col_codice] or "").strip().upper()
            eng = str(row[col_eng] or "").strip()
            ita = str(row[col_ita] or "").strip() if col_ita < len(row) else eng
        except IndexError:
            continue
        if not codice or not eng:
            continue
        regione = REGIONI.get(codice[0], "Altro") if codice else "Altro"
        categoria = CATEGORIE.get(codice[1], "Altro") if len(codice) > 1 else "Altro"
        records.append({
            "id": str(uuid.uuid4()),
            "codice": codice,
            "descrizione_ita": ita or eng,
            "descrizione_eng": eng,
            "regione_anatomica": regione,
            "categoria_patologia": categoria,
            "versione": "v15",
        })
    wb.close()
    return records


def upsert_batch(records, supabase_url, key):
    url = f"{supabase_url.rstrip('/')}/rest/v1/osiics_codes"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    # Supabase REST accepts up to ~1000 rows per request
    batch_size = 500
    inserted = 0
    for start in range(0, len(records), batch_size):
        batch = records[start:start + batch_size]
        resp = requests.post(url, headers=headers, data=json.dumps(batch), timeout=30)
        if resp.status_code not in (200, 201):
            print(f"  Errore batch {start}–{start+len(batch)}: {resp.status_code} {resp.text[:200]}")
        else:
            inserted += len(batch)
            print(f"  Caricati {inserted}/{len(records)} codici…")
    return inserted


def main():
    args = parse_args()

    print(f"Lettura file Excel: {args.file}")
    records = load_excel(
        args.file, args.sheet,
        args.col_codice, args.col_eng, args.col_ita,
        args.skip_rows
    )
    print(f"Trovati {len(records)} codici OSIICS")

    if args.dry_run:
        for r in records[:10]:
            print(r)
        print("… (dry-run, nessun dato caricato)")
        return

    print(f"Caricamento su Supabase: {args.url}")
    inserted = upsert_batch(records, args.url, args.key)
    print(f"Completato: {inserted} codici caricati in osiics_codes.")


if __name__ == "__main__":
    main()

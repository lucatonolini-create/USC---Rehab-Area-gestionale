import Dexie, { type Table } from "dexie";
import type { Atleta, Programma, Impostazioni } from "./store";

export type PendingOp = {
  id?: number;
  table: "atleti" | "programmi" | "impostazioni";
  op: "upsert" | "delete";
  payload: unknown;
  createdAt: number;
};

class RehabDB extends Dexie {
  atleti!: Table<Atleta, string>;
  programmi!: Table<Programma, string>;
  impostazioni!: Table<Impostazioni & { id: number }, number>;
  pendingOps!: Table<PendingOp, number>;

  constructor() {
    super("rehabDB");
    this.version(1).stores({
      atleti: "id",
      programmi: "id, atletaId",
      impostazioni: "id",
      pendingOps: "++id, table",
    });
  }
}

let _db: RehabDB | null = null;

export function getDB(): RehabDB {
  if (!_db) _db = new RehabDB();
  return _db;
}

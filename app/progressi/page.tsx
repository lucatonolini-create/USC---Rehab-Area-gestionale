import { TrendingUp, TrendingDown, Minus, Award, Target } from "lucide-react";

const datiProgressi = [
  {
    atleta: "Marco Rossi",
    infortunio: "Rottura LCA",
    settimane: [
      { settimana: "Sett. 1", valore: 10 },
      { settimana: "Sett. 2", valore: 20 },
      { settimana: "Sett. 3", valore: 32 },
      { settimana: "Sett. 4", valore: 50 },
      { settimana: "Sett. 5", valore: 63 },
      { settimana: "Sett. 6", valore: 75 },
    ],
    dolore: 2,
    forzaPerc: 72,
    mobilita: 80,
    obiettivo: "Ritorno al campo",
    dataObj: "Settembre 2026",
  },
  {
    atleta: "Giulia Ferrari",
    infortunio: "Lesione bicipite femorale",
    settimane: [
      { settimana: "Sett. 1", valore: 15 },
      { settimana: "Sett. 2", valore: 35 },
      { settimana: "Sett. 3", valore: 60 },
    ],
    dolore: 3,
    forzaPerc: 58,
    mobilita: 70,
    obiettivo: "Corsa libera",
    dataObj: "Luglio 2026",
  },
  {
    atleta: "Luca Bianchi",
    infortunio: "Distorsione caviglia",
    settimane: [
      { settimana: "Sett. 1", valore: 40 },
      { settimana: "Sett. 2", valore: 60 },
      { settimana: "Sett. 3", valore: 75 },
      { settimana: "Sett. 4", valore: 90 },
    ],
    dolore: 1,
    forzaPerc: 90,
    mobilita: 95,
    obiettivo: "Ritorno al campo",
    dataObj: "Luglio 2026",
  },
];

function MiniChart({ dati }: { dati: { settimana: string; valore: number }[] }) {
  const max = 100;
  const w = 200;
  const h = 60;
  const pts = dati.map((d, i) => {
    const x = (i / (dati.length - 1)) * w;
    const y = h - (d.valore / max) * h;
    return `${x},${y}`;
  });
  const last = dati[dati.length - 1].valore;
  const prev = dati[dati.length - 2]?.valore ?? last;
  const trend = last > prev ? "up" : last < prev ? "down" : "flat";

  return (
    <div className="flex items-end gap-3">
      <svg width={w} height={h} className="overflow-visible">
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="#003087"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {dati.map((d, i) => {
          const x = (i / (dati.length - 1)) * w;
          const y = h - (d.valore / max) * h;
          return (
            <circle key={i} cx={x} cy={y} r="3" fill="#003087" />
          );
        })}
      </svg>
      <div className={`p-1 rounded-full ${trend === "up" ? "bg-green-100" : trend === "down" ? "bg-red-100" : "bg-gray-100"}`}>
        {trend === "up" ? (
          <TrendingUp className="w-4 h-4 text-green-600" />
        ) : trend === "down" ? (
          <TrendingDown className="w-4 h-4 text-red-600" />
        ) : (
          <Minus className="w-4 h-4 text-gray-500" />
        )}
      </div>
    </div>
  );
}

function MetricBadge({ label, value, suffix = "%", color = "blue" }: {
  label: string; value: number; suffix?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-[#003087]",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className={`rounded-xl p-3 ${colors[color]}`}>
      <p className="text-xs opacity-70 mb-0.5">{label}</p>
      <p className="text-xl font-bold">{value}{suffix}</p>
    </div>
  );
}

export default function ProgressiPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Progressi</h1>
        <p className="text-gray-500 mt-1">Monitoraggio del recupero per ogni atleta</p>
      </div>

      <div className="space-y-6">
        {datiProgressi.map((d, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#003087] rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {d.atleta.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{d.atleta}</h3>
                  <p className="text-sm text-gray-500">{d.infortunio}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#FFCC00]/20 text-[#003087] px-4 py-2 rounded-xl">
                <Target className="w-4 h-4" />
                <div className="text-right">
                  <p className="text-xs opacity-70">{d.obiettivo}</p>
                  <p className="text-sm font-bold">{d.dataObj}</p>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 font-medium">Andamento recupero</p>
              <MiniChart dati={d.settimane} />
              <div className="flex gap-2 mt-2">
                {d.settimane.map((s, j) => (
                  <span key={j} className="text-xs text-gray-400 flex-1 text-center">{s.settimana}</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MetricBadge label="Forza muscolare" value={d.forzaPerc} color="blue" />
              <MetricBadge label="Mobilità articolare" value={d.mobilita} color="green" />
              <MetricBadge
                label="Livello dolore (0-10)"
                value={d.dolore}
                suffix="/10"
                color={d.dolore <= 2 ? "green" : d.dolore <= 4 ? "orange" : "red"}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

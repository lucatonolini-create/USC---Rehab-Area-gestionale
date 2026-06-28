import {
  Users,
  Calendar,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Dumbbell,
} from "lucide-react";

const stats = [
  { label: "Atleti Attivi", value: "24", icon: Users, color: "bg-blue-500", change: "+3 questo mese" },
  { label: "Sedute Oggi", value: "8", icon: Calendar, color: "bg-green-500", change: "3 completate" },
  { label: "In Recupero", value: "6", icon: Activity, color: "bg-orange-500", change: "2 in fase critica" },
  { label: "Guarigioni", value: "12", icon: TrendingUp, color: "bg-purple-500", change: "+5 questo mese" },
];

const appuntamentiOggi = [
  { ora: "09:00", atleta: "Marco Rossi", tipo: "Fisioterapia", stato: "completato" },
  { ora: "10:30", atleta: "Giulia Ferrari", tipo: "Recupero muscolare", stato: "completato" },
  { ora: "11:30", atleta: "Luca Bianchi", tipo: "Valutazione", stato: "in corso" },
  { ora: "14:00", atleta: "Sara Esposito", tipo: "Rieducazione motoria", stato: "programmato" },
  { ora: "15:30", atleta: "Andrea Colombo", tipo: "Idroterapia", stato: "programmato" },
  { ora: "17:00", atleta: "Elena Romano", tipo: "Fisioterapia", stato: "programmato" },
];

const atleti = [
  { nome: "Marco Rossi", infortunio: "Legamento crociato", progresso: 75, giorni: 42 },
  { nome: "Giulia Ferrari", infortunio: "Lesione muscolare", progresso: 60, giorni: 18 },
  { nome: "Luca Bianchi", infortunio: "Distorsione caviglia", progresso: 90, giorni: 30 },
  { nome: "Sara Esposito", infortunio: "Frattura tibia", progresso: 40, giorni: 65 },
];

export default function Dashboard() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Benvenuto nel gestionale USC Rehab Area — Sabato, 28 Giugno 2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                  <p className="text-4xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-2">{stat.change}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Appuntamenti di oggi */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Appuntamenti di Oggi</h2>
            <span className="text-sm text-[#003087] font-medium bg-blue-50 px-3 py-1 rounded-full">
              {appuntamentiOggi.length} totali
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {appuntamentiOggi.map((app, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 w-16 shrink-0">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-mono font-medium text-gray-700">{app.ora}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{app.atleta}</p>
                  <p className="text-xs text-gray-500">{app.tipo}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  app.stato === "completato"
                    ? "bg-green-100 text-green-700"
                    : app.stato === "in corso"
                    ? "bg-[#FFCC00] text-[#003087]"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {app.stato === "completato" ? "Completato" : app.stato === "in corso" ? "In corso" : "Programmato"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Atleti in recupero */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Atleti in Recupero</h2>
            <Dumbbell className="w-5 h-5 text-gray-400" />
          </div>
          <div className="p-6 space-y-5">
            {atleti.map((atleta, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{atleta.nome}</p>
                    <p className="text-xs text-gray-500">{atleta.infortunio} · {atleta.giorni} giorni</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {atleta.progresso >= 80 ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : atleta.progresso < 50 ? (
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                    ) : null}
                    <span className="text-sm font-bold text-gray-700">{atleta.progresso}%</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      atleta.progresso >= 80
                        ? "bg-green-500"
                        : atleta.progresso >= 50
                        ? "bg-[#FFCC00]"
                        : "bg-orange-500"
                    }`}
                    style={{ width: `${atleta.progresso}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

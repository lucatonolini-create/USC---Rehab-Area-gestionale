import { Settings, Bell, Shield, Users, Building } from "lucide-react";

export default function ImpostazioniPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-gray-500 mt-1">Configura il gestionale USC Rehab Area</p>
      </div>

      <div className="space-y-4">
        {[
          {
            icon: Building,
            titolo: "Struttura",
            descrizione: "Nome, logo, e informazioni dello staff medico",
            voci: ["Nome struttura: USC Rehab Area", "Staff attivi: 4", "Indirizzo: Via dello Sport 1, Milano"],
          },
          {
            icon: Users,
            titolo: "Utenti e permessi",
            descrizione: "Gestione accessi fisioterapisti e medici",
            voci: ["Dott. Conti – Fisioterapista", "Dott.ssa Mori – Fisioterapista", "Dr. Sala – Medico sportivo"],
          },
          {
            icon: Bell,
            titolo: "Notifiche",
            descrizione: "Promemoria appuntamenti e alert di recupero",
            voci: ["Promemoria 30 min prima: Attivo", "Alert progressi settimanali: Attivo", "Email riepilogo: Disattivo"],
          },
          {
            icon: Shield,
            titolo: "Privacy e dati",
            descrizione: "GDPR, backup e gestione dati sensibili",
            voci: ["Backup automatico: Ogni notte alle 02:00", "Crittografia dati: Attiva (AES-256)", "Consensi firmati: 24/24"],
          },
        ].map((sezione) => {
          const Icon = sezione.icon;
          return (
            <div key={sezione.titolo} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#C8102E]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-0.5">{sezione.titolo}</h3>
                  <p className="text-sm text-gray-500 mb-4">{sezione.descrizione}</p>
                  <ul className="space-y-2">
                    {sezione.voci.map((v, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#C8102E] rounded-full shrink-0" />
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>
                <button className="text-sm text-[#C8102E] font-medium hover:underline shrink-0">
                  Modifica
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

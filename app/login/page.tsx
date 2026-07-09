"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email o password non corretti.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center bg-gray-50 px-4"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-4 p-1.5">
            <Image src="/logo.png" alt="U.S. Cremonese" width={56} height={56} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">U.S. Cremonese</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rehab Area — Accesso riservato</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="staff@cremonese.it"
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C8102E] text-white py-3 rounded-xl text-sm font-semibold hover:bg-red-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Accesso in corso…" : "Accedi"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Accesso riservato allo staff medico U.S. Cremonese
        </p>
      </div>
    </div>
  );
}

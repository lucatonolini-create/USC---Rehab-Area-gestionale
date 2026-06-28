import { createClient } from "@supabase/supabase-js";

// During build, env vars are absent — provide placeholder so createClient doesn't throw.
// At runtime in the browser, the real NEXT_PUBLIC_ values are injected.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(url, key);

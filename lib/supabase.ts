import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

// createBrowserClient stores the session in cookies so the middleware can read it.
export const supabase = createBrowserClient(url, key);

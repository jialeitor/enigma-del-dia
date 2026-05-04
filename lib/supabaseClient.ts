import { createClient } from '@supabase/supabase-js';

// Estas variables vienen de tu archivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Creamos el cliente de Supabase para usarlo en toda la app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
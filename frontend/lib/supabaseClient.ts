// Importamos la función para crear el cliente de Supabase para el navegador
import { createBrowserClient } from '@supabase/ssr'

// Leemos las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validación
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Creamos y exportamos la instancia del cliente para el navegador
// createBrowserClient maneja automáticamente la sincronización de sesión con cookies
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

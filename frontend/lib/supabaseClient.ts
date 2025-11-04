// Importamos la función para crear el cliente de Supabase desde la librería oficial
import { createClient } from '@supabase/supabase-js'

// Leemos las variables de entorno que contienen la URL y la API key pública de nuestro proyecto Supabase
// NEXT_PUBLIC_ es el prefijo que Next.js requiere para exponer variables al navegador
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validación: si faltan las variables de entorno, lanzamos error para evitar que la app corra sin configuración
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Creamos y exportamos la instancia del cliente de Supabase con configuración de autenticación
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // persistSession: true → guarda la sesión en localStorage para que persista entre recargas
    persistSession: true,
    // autoRefreshToken: true → renueva automáticamente el token antes de que expire (evita que el usuario tenga que hacer login de nuevo)
    autoRefreshToken: true,
    // detectSessionInUrl: true → detecta tokens en la URL (usado en flujos OAuth como Google login)
    detectSessionInUrl: true
  }
})

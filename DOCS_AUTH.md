# Documentación - Páginas de Autenticación

## Páginas Auth Incluidas
1. `pages/auth/login.tsx` - Inicio de sesión
2. `pages/auth/register.tsx` - Registro de nuevo usuario
3. `pages/auth/forgot-password.tsx` - Recuperar contraseña
4. `pages/auth/update-password.tsx` - Actualizar contraseña

---

## 1. Login (pages/auth/login.tsx)

### Descripción
Página de inicio de sesión donde usuarios existentes ingresan con email y contraseña.

### Imports y Estado

```tsx
import { useState } from 'react'
```
**Explicación**: Hook para manejar estado local (email, password, error)

```tsx
import { supabase } from '../../lib/supabaseClient'
```
**Explicación**: Cliente de Supabase para llamar a `auth.signInWithPassword()`

```tsx
import { useRouter } from 'next/router'
```
**Explicación**: Para redirigir al dashboard después de login exitoso

```tsx
import Link from 'next/link'
```
**Explicación**: Para enlaces a otras páginas (register, forgot-password)

```tsx
import Layout from '../../components/Layout'
```
**Explicación**: Envuelve la página con Layout (con `hideAuthLinks` para no mostrar Login/Register en navbar)

```tsx
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [error, setError] = useState<string | null>(null)
const router = useRouter()
```
**Explicación**: Estados locales:
- `email`, `password`: valores de los inputs
- `error`: mensaje de error si falla el login
- `router`: para navegación

### Función handleLogin

```tsx
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
```
**Explicación**: Previene el reload de página al enviar el form

```tsx
  const { error } = await supabase.auth.signInWithPassword({ email, password })
```
**Explicación**: Llama a Supabase para autenticar con email/password
- Si es correcto, Supabase guarda la sesión en localStorage automáticamente
- Devuelve error si credenciales inválidas

```tsx
  if (error) setError(error.message)
  else router.push('/dashboard')
}
```
**Explicación**: Si hay error, lo muestra. Si no, redirige al dashboard.

### Render

```tsx
return (
  <Layout hideAuthLinks>
```
**Explicación**: Usa Layout con `hideAuthLinks` para que no se vean los botones Login/Register en el navbar (ya estamos en login)

```tsx
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200 px-2">
```
**Explicación**: Contenedor centrado con gradiente de fondo

```tsx
      <form onSubmit={handleLogin} className="w-full max-w-md p-8 bg-white/90 rounded-2xl shadow-2xl border border-blue-100 backdrop-blur-md">
```
**Explicación**: Form con estilo de card glassmorphism

```tsx
        <h2 className="text-3xl font-extrabold text-blue-700 mb-6 text-center">Iniciar Sesión</h2>
        {error && <p className="text-red-600 bg-red-50 p-3 rounded-lg mb-4 text-sm">{error}</p>}
```
**Explicación**: Título + banner de error (solo si hay error)

```tsx
        <input 
          className="w-full mb-4 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
        />
```
**Explicación**: Input controlado para email

```tsx
        <input 
          className="w-full mb-4 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" 
          type="password" 
          placeholder="Contraseña" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
        />
```
**Explicación**: Input controlado para contraseña (type="password" oculta caracteres)

```tsx
        <button 
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-600 transition-all duration-200" 
          type="submit"
        >
          Iniciar Sesión
        </button>
```
**Explicación**: Botón de envío con gradiente y efecto hover

```tsx
        <div className="mt-6 text-center space-y-2">
          <Link href="/auth/forgot-password" className="block text-sm text-blue-600 hover:text-blue-800 font-semibold">
            ¿Olvidaste tu contraseña?
          </Link>
          <Link href="/auth/register" className="block text-sm text-gray-600 hover:text-gray-800">
            ¿No tienes cuenta? <span className="font-semibold text-blue-600">Regístrate</span>
          </Link>
        </div>
```
**Explicación**: Enlaces a otras páginas de auth

---

## 2. Register (pages/auth/register.tsx)

### Descripción
Página de registro para nuevos usuarios.

### Diferencias clave con Login

```tsx
const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault()
  try {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: 'https://onkzxqtejpyauibwqhop.supabase.co/auth/v1/callback'
      }
    })
```
**Explicación**: Usa `signUp()` en lugar de `signInWithPassword()`
- `emailRedirectTo`: URL a donde redirigir después de confirmar email
- Supabase envía email de confirmación automáticamente

```tsx
    if (error) {
      console.error('Supabase error:', error)
      setMessage(error.message)
    } else {
      setMessage('Revisa tu correo para confirmar la cuenta')
    }
```
**Explicación**: Si no hay error, muestra mensaje de éxito (revisar correo)

### Flujo Post-Registro

1. Usuario llena form y envía
2. Supabase crea cuenta en `auth.users`
3. Trigger `on_auth_user_created` crea perfil en tabla `profiles`
4. Supabase envía email de confirmación
5. Usuario hace clic en link del email
6. Cuenta queda confirmada, puede hacer login

---

## 3. Forgot Password (pages/auth/forgot-password.tsx)

### Descripción
Permite recuperar contraseña enviando email con link de reset.

### Función clave

```tsx
const handleResetPassword = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
```
**Explicación**: 
- `resetPasswordForEmail()`: envía email con link mágico
- `redirectTo`: URL a donde redirigir después de hacer clic en el link (página de actualizar contraseña)

```tsx
    if (error) throw error
    setMessage('Revisa tu email para restablecer tu contraseña')
  } catch (error) {
    setMessage('Error: ' + (error instanceof Error ? error.message : String(error)))
  } finally {
    setLoading(false)
  }
}
```
**Explicación**: Muestra mensaje de éxito o error según resultado

### Flujo

1. Usuario ingresa email
2. Supabase envía email con link
3. Usuario hace clic en link
4. Es redirigido a `/auth/update-password` con token en URL
5. Puede ingresar nueva contraseña

---

## 4. Update Password (pages/auth/update-password.tsx)

### Descripción
Página donde el usuario establece nueva contraseña después de hacer clic en link de recovery.

### Verificación de Sesión

```tsx
useEffect(() => {
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth/login')
    }
  }
  checkSession()
}, [router])
```
**Explicación**: Verifica que haya sesión (token válido en URL). Si no hay, redirige a login.
- El token de recovery establece una sesión temporal que permite cambiar la contraseña

### Función de Actualización

```tsx
const handleUpdatePassword = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  try {
    const { error } = await supabase.auth.updateUser({
      password: password
    })
```
**Explicación**: `updateUser()` actualiza la contraseña del usuario autenticado (sesión temporal)

```tsx
    if (error) throw error
    
    setMessage('Contraseña actualizada correctamente')
    setTimeout(() => router.push('/auth/login'), 2000)
```
**Explicación**: Si no hay error, muestra mensaje de éxito y redirige a login después de 2 segundos

```tsx
  } catch (error) {
    setMessage('Error: ' + (error instanceof Error ? error.message : String(error)))
  } finally {
    setLoading(false)
  }
}
```
**Explicación**: Manejo de errores y estado de carga

### Validación de Input

```tsx
<input
  type="password"
  required
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
  placeholder="Nueva contraseña"
  minLength={6}
/>
```
**Explicación**: Input con validación HTML5:
- `required`: no se puede enviar vacío
- `minLength={6}`: mínimo 6 caracteres

---

## Patrones Comunes en Todas las Páginas Auth

### 1. Uso de Layout con hideAuthLinks

```tsx
<Layout hideAuthLinks>
```
**Explicación**: Todas las páginas de auth usan esta prop para ocultar los botones Login/Register del navbar (evita redundancia)

### 2. Estados Locales

```tsx
const [loading, setLoading] = useState(false)
const [message, setMessage] = useState<string | null>(null)
```
**Explicación**: Patrón común:
- `loading`: para deshabilitar botón mientras procesa
- `message`: para mostrar mensajes de éxito o error

### 3. Manejo de Errores

```tsx
try {
  const { error } = await supabase.auth.something()
  if (error) throw error
  setMessage('Éxito')
} catch (error) {
  setMessage('Error: ' + (error instanceof Error ? error.message : String(error)))
}
```
**Explicación**: Try-catch para capturar errores de Supabase y mostrarlos al usuario

### 4. UI Consistente

- Formularios centrados con `min-h-screen flex items-center justify-center`
- Cards con `bg-white/90 rounded-2xl shadow-2xl`
- Gradientes de fondo `bg-gradient-to-br from-blue-50...`
- Inputs con `focus:ring-2 focus:ring-blue-300`
- Botones con gradiente `from-blue-600 to-indigo-500`

### 5. Links de Navegación

Todas las páginas tienen enlaces cruzados:
- Login ↔ Register
- Login → Forgot Password
- Forgot Password → Update Password (automático)

---

## Seguridad

### Protecciones Implementadas

1. **Email Confirmation**: registro requiere confirmar email antes de poder usar la cuenta
2. **Password Reset Flow**: usa tokens temporales, no permite cambiar sin verificación
3. **Session Management**: Supabase maneja tokens JWT, refresh automático, expiración
4. **RLS**: Row Level Security en todas las tablas protege datos en backend

### Mejoras Potenciales

1. **Rate Limiting**: limitar intentos de login fallidos
2. **2FA**: autenticación de dos factores
3. **OAuth**: login con Google, GitHub, etc. (ya explicado en guía anterior)
4. **Password Strength Meter**: indicador visual de fortaleza de contraseña
5. **Remember Me**: opción para sesiones más largas
6. **CAPTCHA**: en registro para evitar bots

---

## Flujo Completo de Usuario Nuevo

1. Usuario va a `/auth/register`
2. Ingresa email + contraseña → Submit
3. Supabase crea cuenta + envía email
4. Usuario recibe email, hace clic en link
5. Supabase confirma cuenta
6. Usuario va a `/auth/login`
7. Ingresa credenciales → Submit
8. Sesión establecida, redirige a `/dashboard`
9. Puede usar la app normalmente

## Flujo de Recuperación de Contraseña

1. Usuario va a `/auth/forgot-password`
2. Ingresa email → Submit
3. Supabase envía email con link mágico
4. Usuario hace clic en link
5. Es redirigido a `/auth/update-password` (con token en URL)
6. Ingresa nueva contraseña → Submit
7. Contraseña actualizada
8. Redirige a `/auth/login`
9. Usuario inicia sesión con nueva contraseña

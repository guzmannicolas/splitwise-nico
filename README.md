# Dividi2

Aplicación para dividir gastos entre grupos de personas, construida con Next.js y Supabase.

🌐 **App en vivo:** [https://dividi2.nicoguzmandev.com](https://dividi2.nicoguzmandev.com)

---

## 🚀 Setup para Colaboradores

### Requisitos Previos

Instalar en tu computadora:

1. **Node.js 18.x** (recomendado: 18.17.0)
   - Descargar: https://nodejs.org/
   - Verificar: `node -v` (debe mostrar v18.x.x)

2. **Git**
   - Descargar: https://git-scm.com/
   - Verificar: `git --version`

3. **Editor de Código**
   - VS Code (recomendado): https://code.visualstudio.com/

4. **(Opcional) nvm** - Node Version Manager
   - Para cambiar fácilmente entre versiones de Node
   - Windows: https://github.com/coreybutler/nvm-windows

---

## 📥 Clonar el Proyecto

```bash
# 1. Clonar el repositorio
git clone https://github.com/guzmannicolas/splitwise-nico.git

# 2. Entrar a la carpeta
cd splitwise-nico

# 3. Ir a la carpeta del frontend
cd frontend

# 4. Instalar dependencias
npm install
```

---

## 🔑 Configurar Variables de Entorno

1. **Crear archivo `.env.local`** en la carpeta `frontend/`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyxxxxxxxxxxx

# App Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

⚠️ **Importante**: Pedirle a Nico las credenciales actualizadas de Supabase.

---

## ▶️ Correr el Proyecto en Local

```bash
# Desde la carpeta frontend/
npm run dev
```

Abrir en el navegador: **http://localhost:3000**

✅ Deberías ver la landing page de Dividi2

---

## 🌿 Flujo de Trabajo con Git

### Crear una Nueva Feature

```bash
# 1. Asegurarte de estar en main actualizado
git checkout main
git pull origin main

# 2. Crear una rama para tu feature
git checkout -b feature/nombre-de-tu-feature

# 3. Hacer cambios en el código...

# 4. Ver qué archivos cambiaron
git status

# 5. Agregar archivos al commit
git add .

# 6. Hacer commit con mensaje descriptivo
git commit -m "feat: descripción de lo que agregaste"

# 7. Subir tu rama a GitHub
git push origin feature/nombre-de-tu-feature
```

### Abrir Pull Request

1. Ir a GitHub: https://github.com/guzmannicolas/splitwise-nico
2. Vas a ver un botón **"Compare & pull request"** → Click
3. Agregar descripción de los cambios
4. Asignar a Nico como revisor
5. Click **"Create pull request"**

Nico va a revisar tu código y hacer merge cuando esté aprobado.

---

## 🔄 Mantener tu Rama Actualizada

```bash
# Cada vez que vayas a trabajar, actualizar main
git checkout main
git pull origin main

# Si ya tenés una rama de feature activa
git checkout tu-rama-feature
git merge main  # Integra cambios de main a tu rama
```

---

## 🛠️ Comandos Útiles

```bash
# Ver en qué rama estás
git branch

# Cambiar de rama
git checkout nombre-rama

# Ver historial de commits
git log --oneline

# Descartar cambios locales (¡cuidado!)
git checkout -- archivo.tsx

# Ver diferencias antes de commitear
git diff
```

---

## 📚 Stack Tecnológico

- **Frontend**: Next.js 13.5 + React 18 + TypeScript + Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- **Deploy**: Vercel (frontend) + Supabase Cloud (backend)
- **Emails**: Resend (invitaciones automáticas)

---

## 📖 Documentación Adicional

Ver archivos en el repo:

- **`ARCHITECTURE.md`**: Guía completa de arquitectura del proyecto
- **`DOCS_DASHBOARD.md`**: Documentación detallada del dashboard
- **`DOCS_AUTH.md`**: Documentación de páginas de autenticación
- **`DOCS_INVITATIONS.md`**: Sistema de invitaciones a grupos
- **`supabase/SETUP_EMAIL.md`**: Configuración de emails con Resend

---

## 🐛 Troubleshooting

### `npm install` da errores

```bash
# Borrar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Puerto 3000 ocupado

```bash
# Matar proceso en puerto 3000 (Windows)
npx kill-port 3000

# Luego correr de nuevo
npm run dev
```

### Cambios no se ven en el navegador

- Hard refresh: `Ctrl + Shift + R` o `Ctrl + F5`
- Borrar caché del navegador
- Reiniciar dev server: `Ctrl + C` y `npm run dev`

### Error "Missing Supabase environment variables"

- Verificar que `.env.local` existe en `frontend/`
- Verificar que las variables están bien copiadas
- Reiniciar el servidor después de crear `.env.local`

---

## 📞 Contacto

Si tenés dudas o problemas:
- Revisar documentación en `ARCHITECTURE.md`
- Abrir un Issue en GitHub
- Contactar a Nico directamente

---

## 🎯 Próximos Pasos Después del Setup

1. ✅ Clonar repo y correr en local
2. ✅ Crear tu primera rama de feature
3. ✅ Hacer un cambio pequeño de prueba (ej: cambiar un texto)
4. ✅ Commitear y pushear
5. ✅ Abrir tu primer Pull Request

¡Bienvenido al equipo de Dividi2! 🚀

---

**Version 2025**

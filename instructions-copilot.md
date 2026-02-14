# Instrucciones para GitHub Copilot - Splitwise Nico

## Configuración Base

Este proyecto es una aplicación de gastos compartidos (Splitwise clone) construida con:
- **Frontend**: Next.js 13, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Gestión de estado**: Supabase Client con hooks de React
- **Arquitectura**: Páginas SSR/CSR, API routes, componentes funcionales

## Instrucciones Principales

### 1. SIEMPRE lee primero el archivo `agents.md` en la raíz del proyecto
Este archivo contiene el **Agente Orquestador** que decide qué especialista debe manejar cada tipo de solicitud.

### 2. Contexto del Proyecto
- Base de datos: `profiles`, `groups`, `group_members`, `expenses`, `expense_splits`, `settlements`
- RLS habilitado con políticas estrictas basadas en membresía de grupos
- Triggers: `handle_new_user`, `handle_new_group`, auto-fill de `created_by`
- Frontend: páginas en `/frontend/pages/`, componentes reutilizables
- Scripts SQL: `/supabase/` para schema, seed, backups

### 3. Convenciones de Código
- TypeScript estricto, interfaces explícitas
- Componentes funcionales con hooks
- Manejo de errores con try-catch y logs informativos
- Nombres en español para UX, código en inglés
- Tailwind para estilos, sin CSS modules

### 4. Flujo de Trabajo
1. **Leer** `agents.md` para determinar el especialista apropiado
2. **Consultar** documentación específica del agente si es necesario
3. **Implementar** siguiendo las guías del especialista seleccionado
4. **Validar** cambios contra políticas RLS y tipos TS

### 5. Prioridades
- Seguridad: RLS policies correctas, validación de auth
- UX: feedback claro, manejo de loading/error states
- Mantenibilidad: código limpio, comentarios en cambios complejos
- Rendimiento: optimizar queries, evitar N+1

## Estructura de Agentes

Los agentes especializados están en `.copilot/globales/`:
- `architect.md` - Decisiones de arquitectura, estructura de datos
- `backend.md` - Supabase, RLS, triggers, funciones SQL
- `ui-developer.md` - Componentes React, Tailwind, UX
- `gitflow.md` - Git commits, branches, PRs

**IMPORTANTE**: Antes de responder cualquier solicitud, consulta `agents.md` para determinar qué especialista debe intervenir.

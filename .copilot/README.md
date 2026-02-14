# Sistema de Agentes de GitHub Copilot

Este directorio contiene el sistema de instrucciones especializadas para GitHub Copilot en el proyecto Splitwise.

## Estructura

```
.copilot/
├── globales/
│   ├── architect.md       # Especialista en arquitectura y diseño de bases de datos
│   ├── backend.md         # Especialista en PostgreSQL, RLS, Supabase, Edge Functions
│   ├── ui-developer.md    # Especialista en React, Next.js, Tailwind CSS, forms
│   └── gitflow.md         # Especialista en Git workflow, commits, PRs, releases
└── project/               # (Reservado para futuros agentes específicos de proyecto)
```

## Cómo Funciona

1. **Punto de entrada**: `instructions-copilot.md` (raíz del proyecto)
   - GitHub Copilot lee este archivo primero
   - Contiene contexto general del proyecto

2. **Orquestador**: `agents.md` (raíz del proyecto)
   - Analiza la consulta del usuario
   - Decide qué agente especializado invocar
   - Puede combinar múltiples agentes si es necesario

3. **Agentes especializados**: Archivos en `.copilot/globales/`
   - Cada uno tiene expertise en su dominio
   - Contienen patterns, ejemplos, checklists
   - Producen respuestas completas y ejecutables

## Agentes Disponibles

### 🏗️ Architect
**Cuándo usar**: Diseño de schema, decisiones arquitectónicas, escalabilidad
- Diseño de tablas y relaciones
- Normalización de datos
- Índices y constraints
- Políticas RLS de alto nivel
- Decisiones de arquitectura

### 🔧 Backend Developer
**Cuándo usar**: Implementación de backend, queries, funciones, debugging
- Migrations SQL
- Políticas RLS detalladas
- Funciones PostgreSQL/PL/pgSQL
- Edge Functions (Deno/TypeScript)
- Debugging de queries y performance
- Troubleshooting 403 errors

### 💅 UI Developer
**Cuándo usar**: Componentes React, estilos, formularios, UX
- Componentes React/Next.js
- TypeScript types
- Tailwind CSS styling
- React Hook Form + Zod
- Custom hooks
- Loading/error/empty states
- Accesibilidad

### 🌿 Gitflow Expert
**Cuándo usar**: Commits, branches, PRs, releases, limpieza de repositorio
- Conventional commits
- Branching strategy (feature/bugfix/hotfix/release)
- Pull request templates
- Code review guidelines
- Git commands
- Versioning (SemVer)

## Ejemplos de Uso

### Ejemplo 1: "Necesito agregar una tabla de notificaciones"
**Orquestador decide**: Architect (diseño) + Backend (implementación)
1. Architect diseña schema, relaciones, índices
2. Backend genera migration SQL completa con RLS

### Ejemplo 2: "El formulario de gastos necesita validación"
**Orquestador decide**: UI Developer
- Implementa React Hook Form + Zod
- Agrega componentes de error
- Maneja estados de loading

### Ejemplo 3: "Tengo un 403 al crear un gasto"
**Orquestador decide**: Backend
- Diagnostica política RLS
- Verifica función helper
- Proporciona queries de debugging

### Ejemplo 4: "Quiero mergear mi feature a develop"
**Orquestador decide**: Gitflow
- Verifica commits convencionales
- Provee comando para merge
- Sugiere PR template

### Ejemplo 5: "Implementar push notifications PWA"
**Orquestador decide**: Architect + Backend + UI Developer
1. Architect: tabla push_subscriptions, decisiones de arquitectura
2. Backend: migration, Edge Function, RLS policies
3. UI Developer: Service Worker, manifest, hooks, componentes

## Mejores Prácticas

- **Sé específico**: "Agregar validación de email" en lugar de "mejorar formulario"
- **Contexto**: Menciona el componente/tabla/función afectada
- **Tipo de ayuda**: ¿Diseño? ¿Implementación? ¿Debugging?
- **Confía en el orquestador**: Él decidirá qué agente(s) invocar

## Mantenimiento

### Actualizar agente existente
Edita el archivo markdown correspondiente en `.copilot/globales/`

### Agregar nuevo agente
1. Crear archivo en `.copilot/globales/nuevo-agente.md`
2. Seguir estructura: identidad, expertise, patterns, casos de uso, checklist
3. Actualizar `agents.md` para incluir el nuevo agente en la matriz de decisión

### Agregar agente específico de proyecto
Crear archivo en `.copilot/project/` para funcionalidad muy específica del dominio

## Contribuir

Al modificar agentes:
- Mantén ejemplos completos y ejecutables
- Incluye casos de uso reales
- Agrega anti-patterns (qué NO hacer)
- Checklist de validación
- Referencias a otros agentes cuando sea necesario

---

**Versión**: 1.0.0  
**Última actualización**: 2024  
**Compatibilidad**: GitHub Copilot Chat

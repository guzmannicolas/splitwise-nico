# Estructura de Branches - Splitwise Nico

## Estado Actual (Post-reorganización Gitflow)

### Branches Principales

#### `main`
- **Propósito**: Código en producción
- **Protección**: Solo merge via PR
- **Base para**: hotfix/*, releases

#### `develop`
- **Propósito**: Rama de integración, código estable pre-producción
- **Base para**: feature/*, bugfix/*
- **Merge hacia**: main (via release branches)

### Branches Activas

#### `feature/push-notifications`
- **Propósito**: Implementación de notificaciones push usando Supabase + VAPID
- **Estado**: En desarrollo, ~5 commits adelante de main
- **Incluye**: Sistema de agentes Copilot + notificaciones push
- **Base**: main (pendiente rebase a develop)
- **Acción recomendada**: Rebase sobre develop cuando esté lista para merge

#### `feature/new-expense-ui`
- **Propósito**: Rediseño UI del formulario de añadir gastos
- **Estado**: En desarrollo, ~3 commits adelante de main
- **Incluye**: Modal responsive, nuevo UI
- **Base**: main (pendiente rebase a develop)
- **Acción recomendada**: Revisar solapamiento con feature/mejorar-agregar-gasto

#### `feature/mejorar-agregar-gasto`
- **Propósito**: Mejoras al formulario de añadir gastos
- **Estado**: En desarrollo, ~2 commits adelante de main
- **Incluye**: Modal de división moderno con animaciones
- **Base**: main (pendiente rebase a develop)
- **Nota**: Posible solapamiento con feature/new-expense-ui, considerar merge/squash

---

## Cambios Realizados

### Branches Eliminadas (Ya mergeadas a main)

✅ Eliminadas localmente y remotamente:
- `feature/Paso2-solid`
- `feature/actualizar-html-title`
- `feature/refactor-grupo`
- `feature/refactor-grupov2`
- `feature/refactor-grupov3`
- `feature/refactor-grupov4`

### Branches Renombradas

| Antes | Después | Razón |
|-------|---------|-------|
| `feature-push-notific` | `feature/push-notifications` | Convención Gitflow (slash + nombre descriptivo) |
| `new-expense-interfaz` | `feature/new-expense-ui` | Prefijo feature/ + inglés consistente |

---

## Workflow Gitflow Recomendado

### Para nuevas features:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-descriptivo
# ... trabajo ...
git add .
git commit -m "feat(scope): descripción"
git push -u origin feature/nombre-descriptivo
# Crear PR hacia develop
```

### Para bugfixes:
```bash
git checkout develop
git pull origin develop
git checkout -b bugfix/descripcion-del-bug
# ... trabajo ...
git commit -m "fix(scope): descripción"
git push -u origin bugfix/descripcion-del-bug
# Crear PR hacia develop
```

### Para hotfixes (urgentes en producción):
```bash
git checkout main
git pull origin main
git checkout -b hotfix/descripcion-critica
# ... fix ...
git commit -m "fix(scope)!: descripción BREAKING CHANGE"
# Merge a main Y develop
```

### Preparar release:
```bash
git checkout develop
git pull origin develop
git checkout -b release/v1.x.0
npm version minor  # o patch/major
# Actualizar CHANGELOG.md
git commit -m "chore(release): prepare v1.x.0"
# Merge a main con tag, luego back-merge a develop
```

---

## Próximos Pasos Recomendados

1. **Rebase features activas sobre develop**:
   ```bash
   git checkout feature/push-notifications
   git rebase develop
   git push --force-with-lease origin feature/push-notifications
   ```

2. **Resolver solapamiento entre `feature/new-expense-ui` y `feature/mejorar-agregar-gasto`**:
   - Revisar diffs: `git diff feature/new-expense-ui feature/mejorar-agregar-gasto`
   - Decidir: ¿merge una en la otra?, ¿mantener ambas?, ¿squash?

3. **Crear PRs hacia develop** para las features activas cuando estén listas.

4. **Configurar branch protection en GitHub**:
   - `main`: require PR reviews, require status checks
   - `develop`: require PR reviews

5. **Documentar en CHANGELOG** cuando se mergee a develop.

---

## Convenciones de Naming

### Branches
- `feature/descripcion-kebab-case` - Nuevas funcionalidades
- `bugfix/descripcion-bug` - Correcciones en desarrollo
- `hotfix/descripcion-critica` - Correcciones urgentes en producción
- `release/vX.Y.Z` - Preparación de versión

### Commits (Conventional Commits)
- `feat(scope): descripción` - Nueva feature
- `fix(scope): descripción` - Bug fix
- `docs(scope): descripción` - Documentación
- `refactor(scope): descripción` - Refactorización
- `chore(scope): descripción` - Mantenimiento

**Scopes comunes**: `expenses`, `groups`, `rls`, `ui`, `backend`, `auth`, `settlements`, `dashboard`

---

## Referencias

- Ver `.copilot/globales/gitflow.md` para guía completa de Gitflow
- Ver `agents.md` para workflow de desarrollo con agentes especializados
- Ver `instructions-copilot.md` para instrucciones generales del proyecto

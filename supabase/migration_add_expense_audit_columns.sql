-- Migración: Agregar columnas de auditoría a expenses
-- Propósito: Tracking de quién creó y modificó cada gasto

-- 1. Agregar columna created_by (quién creó el gasto)
ALTER TABLE expenses 
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Agregar columna updated_at (fecha de última modificación)
ALTER TABLE expenses 
ADD COLUMN updated_at TIMESTAMPTZ;

-- 3. Agregar columna updated_by (quién modificó por última vez)
ALTER TABLE expenses 
ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Agregar índices para mejorar performance en queries de auditoría
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_expenses_updated_by ON expenses(updated_by);
CREATE INDEX idx_expenses_updated_at ON expenses(updated_at DESC);

-- 5. Comentarios para documentar las columnas
COMMENT ON COLUMN expenses.created_by IS 'Usuario que creó el gasto';
COMMENT ON COLUMN expenses.updated_at IS 'Fecha y hora de última modificación';
COMMENT ON COLUMN expenses.updated_by IS 'Usuario que realizó la última modificación';

-- 6. (OPCIONAL) Backfill: Establecer created_by = paid_by para gastos existentes
-- Descomenta si querés que los gastos viejos tengan un valor en created_by
UPDATE expenses 
SET created_by = paid_by 
WHERE created_by IS NULL;

-- 7. (OPCIONAL) Trigger para actualizar updated_at automáticamente
-- Descomenta si querés que Supabase actualice updated_at en cada UPDATE
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_expenses_updated_at();

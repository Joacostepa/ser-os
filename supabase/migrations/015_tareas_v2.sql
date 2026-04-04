-- ============================================================
-- 015: Tareas v2 — campos faltantes + plantilla_items
-- ============================================================

-- Campos faltantes en tareas
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS fase VARCHAR(30);
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS prioridad VARCHAR(10) DEFAULT 'normal';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES usuarios(id);
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS fecha_inicio TIMESTAMPTZ;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Index adicional
CREATE INDEX IF NOT EXISTS idx_tareas_fase ON tareas(fase);
CREATE INDEX IF NOT EXISTS idx_tareas_prioridad ON tareas(prioridad);

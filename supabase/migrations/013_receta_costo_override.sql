-- ============================================================
-- 013: Costo override en items de receta
-- ============================================================

ALTER TABLE receta_insumos ADD COLUMN IF NOT EXISTS costo_override DECIMAL(15,2);

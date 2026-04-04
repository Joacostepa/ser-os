-- ============================================================
-- 012: Costeo basado en recetas + historial de costos de insumos
-- ============================================================

CREATE TABLE historial_costos_insumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  costo_anterior DECIMAL(15,2) NOT NULL,
  costo_nuevo DECIMAL(15,2) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo VARCHAR(255),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_historial_costos_insumo ON historial_costos_insumo(insumo_id);

ALTER TABLE historial_costos_insumo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "historial_costos_select" ON historial_costos_insumo FOR SELECT TO authenticated USING (true);
CREATE POLICY "historial_costos_insert" ON historial_costos_insumo FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'operaciones'));

-- ============================================================
-- 017: Pedidos editables — snapshot TN + historial ediciones
-- ============================================================

-- Snapshot inmutable del pedido original de TN
CREATE TABLE IF NOT EXISTS pedido_snapshot_tn (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE UNIQUE,
  items_original JSONB NOT NULL,
  monto_total_original DECIMAL(15,2) NOT NULL,
  monto_neto_original DECIMAL(15,2),
  descuento_original DECIMAL(15,2) DEFAULT 0,
  costo_envio_original DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de ediciones
CREATE TABLE IF NOT EXISTS pedido_ediciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  motivo TEXT NOT NULL,
  tipo_cambio VARCHAR(30) NOT NULL,
  detalle JSONB NOT NULL,
  monto_total_anterior DECIMAL(15,2) NOT NULL,
  monto_total_nuevo DECIMAL(15,2) NOT NULL,
  monto_neto_anterior DECIMAL(15,2),
  monto_neto_nuevo DECIMAL(15,2)
);

CREATE INDEX IF NOT EXISTS idx_pedido_ediciones_pedido ON pedido_ediciones(pedido_id);

-- Campos adicionales en pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS editado BOOLEAN DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_ultima_edicion TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cantidad_ediciones INT DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS descuento DECIMAL(15,2) DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS costo_envio DECIMAL(15,2) DEFAULT 0;

-- RLS
ALTER TABLE pedido_snapshot_tn ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_ediciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshot_select" ON pedido_snapshot_tn FOR SELECT TO authenticated USING (true);
CREATE POLICY "snapshot_insert" ON pedido_snapshot_tn FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ediciones_select" ON pedido_ediciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "ediciones_insert" ON pedido_ediciones FOR INSERT TO authenticated WITH CHECK (get_user_rol() = 'admin');

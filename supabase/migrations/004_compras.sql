-- ============================================================
-- 004: Compras — Órdenes de compra a proveedores
-- ============================================================

-- Enum de estados
CREATE TYPE estado_compra AS ENUM (
  'borrador',
  'enviada',
  'confirmada',
  'recibida_parcial',
  'recibida',
  'cancelada'
);

-- Tabla principal
CREATE TABLE compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE RESTRICT,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  estado estado_compra NOT NULL DEFAULT 'borrador',
  fecha_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_esperada DATE,
  fecha_recibida DATE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX idx_compras_pedido ON compras(pedido_id);
CREATE INDEX idx_compras_estado ON compras(estado);

-- Items de cada compra
CREATE TABLE items_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  cantidad_recibida INT NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_compra_compra ON items_compra(compra_id);

-- Trigger para updated_at en compras
CREATE OR REPLACE FUNCTION update_compras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compras_updated_at
  BEFORE UPDATE ON compras
  FOR EACH ROW EXECUTE FUNCTION update_compras_updated_at();

-- Vincular pagos con compras
ALTER TABLE pagos ADD COLUMN compra_id UUID REFERENCES compras(id) ON DELETE SET NULL;
CREATE INDEX idx_pagos_compra ON pagos(compra_id);

-- RLS
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_compra ENABLE ROW LEVEL SECURITY;

-- Lectura para todos los autenticados
CREATE POLICY "compras_select" ON compras
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "items_compra_select" ON items_compra
  FOR SELECT TO authenticated USING (true);

-- Escritura admin y operaciones
CREATE POLICY "compras_insert" ON compras
  FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "compras_update" ON compras
  FOR UPDATE TO authenticated USING (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "compras_delete" ON compras
  FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

CREATE POLICY "items_compra_insert" ON items_compra
  FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "items_compra_update" ON items_compra
  FOR UPDATE TO authenticated USING (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "items_compra_delete" ON items_compra
  FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

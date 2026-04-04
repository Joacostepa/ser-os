-- ============================================================
-- 008: Compras v2 — Recepciones, pagos proveedor, historial precios
-- ============================================================

-- ============================================================
-- ALTERs a tabla compras
-- ============================================================
ALTER TABLE compras ADD COLUMN IF NOT EXISTS numero_orden VARCHAR(20);
ALTER TABLE compras ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente';
ALTER TABLE compras ADD COLUMN IF NOT EXISTS fecha_envio DATE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS fecha_confirmacion DATE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS condicion_pago VARCHAR(50);
ALTER TABLE compras ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS descuento DECIMAL(15,2) DEFAULT 0;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS notas_internas TEXT;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS asiento_compra_id INT;

-- Generate OC numbers for existing compras
CREATE SEQUENCE IF NOT EXISTS compras_numero_seq START 1;

CREATE OR REPLACE FUNCTION generar_numero_oc() RETURNS VARCHAR AS $$
DECLARE
  v_num INT;
BEGIN
  v_num := nextval('compras_numero_seq');
  RETURN 'OC-' || LPAD(v_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Set numero_orden for existing compras that don't have one
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM compras WHERE numero_orden IS NULL ORDER BY created_at
  LOOP
    UPDATE compras SET numero_orden = generar_numero_oc() WHERE id = r.id;
  END LOOP;
END $$;

-- Now make it unique and not null
ALTER TABLE compras ALTER COLUMN numero_orden SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_compras_numero_orden ON compras(numero_orden);

-- ============================================================
-- ALTERs a items_compra
-- ============================================================
ALTER TABLE items_compra ADD COLUMN IF NOT EXISTS variante_id UUID REFERENCES variantes(id) ON DELETE SET NULL;

-- ============================================================
-- Tabla: recepciones
-- ============================================================
CREATE TABLE recepciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recepciones_compra ON recepciones(compra_id);

-- ============================================================
-- Tabla: items_recepcion
-- ============================================================
CREATE TABLE items_recepcion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recepcion_id UUID NOT NULL REFERENCES recepciones(id) ON DELETE CASCADE,
  item_compra_id UUID NOT NULL REFERENCES items_compra(id),
  cantidad_recibida DECIMAL(10,2) NOT NULL,
  estado_calidad VARCHAR(20) DEFAULT 'ok' CHECK (estado_calidad IN ('ok','defectuoso','incompleto')),
  notas TEXT
);

CREATE INDEX idx_items_recepcion_recepcion ON items_recepcion(recepcion_id);

-- ============================================================
-- Tabla: pagos_proveedor
-- ============================================================
CREATE TABLE pagos_proveedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES compras(id),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  monto DECIMAL(15,2) NOT NULL,
  metodo_pago VARCHAR(50) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  comprobante_url TEXT,
  observaciones TEXT,
  asiento_id INT REFERENCES asientos(id),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pagos_proveedor_compra ON pagos_proveedor(compra_id);
CREATE INDEX idx_pagos_proveedor_proveedor ON pagos_proveedor(proveedor_id);

-- ============================================================
-- Tabla: historial_precios
-- ============================================================
CREATE TABLE historial_precios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  producto_id UUID REFERENCES productos(id),
  variante_id UUID REFERENCES variantes(id),
  descripcion VARCHAR(255),
  precio_unitario DECIMAL(15,2) NOT NULL,
  fecha DATE NOT NULL,
  compra_id UUID REFERENCES compras(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_historial_precios_proveedor ON historial_precios(proveedor_id);
CREATE INDEX idx_historial_precios_producto ON historial_precios(producto_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE recepciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_recepcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_precios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recepciones_select" ON recepciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "recepciones_insert" ON recepciones FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'operaciones'));

CREATE POLICY "items_recepcion_select" ON items_recepcion FOR SELECT TO authenticated USING (true);
CREATE POLICY "items_recepcion_insert" ON items_recepcion FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'operaciones'));

CREATE POLICY "pagos_proveedor_select" ON pagos_proveedor FOR SELECT TO authenticated USING (true);
CREATE POLICY "pagos_proveedor_insert" ON pagos_proveedor FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'operaciones', 'contabilidad'));

CREATE POLICY "historial_precios_select" ON historial_precios FOR SELECT TO authenticated USING (true);
CREATE POLICY "historial_precios_insert" ON historial_precios FOR INSERT TO authenticated WITH CHECK (true);

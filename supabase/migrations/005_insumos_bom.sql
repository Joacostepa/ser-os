-- ============================================================
-- 005: Insumos + BOM (Recetas) + Movimientos de Stock
-- ============================================================

-- Enums (tipo_movimiento_stock was defined in TS but never created in DB)
CREATE TYPE tipo_movimiento_stock AS ENUM ('entrada', 'salida', 'ajuste', 'devolucion');
CREATE TYPE tipo_insumo AS ENUM ('material', 'servicio');
CREATE TYPE unidad_insumo AS ENUM ('unidades', 'metros', 'kg', 'rollos', 'horas', 'ml', 'litros');
CREATE TYPE referencia_movimiento AS ENUM ('compra', 'pedido', 'ajuste_manual');

-- ============================================================
-- INSUMOS — materiales y servicios que se usan para producir
-- ============================================================
CREATE TABLE insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo tipo_insumo NOT NULL DEFAULT 'material',
  unidad unidad_insumo NOT NULL DEFAULT 'unidades',
  stock_actual NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_minimo NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Fraccionamiento: unidad en que se compra vs unidad en que se usa
  unidad_compra TEXT,
  rendimiento NUMERIC(12,2) NOT NULL DEFAULT 1,
  -- Relaciones opcionales
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_insumos_tipo ON insumos(tipo);
CREATE INDEX idx_insumos_activo ON insumos(activo);
CREATE INDEX idx_insumos_proveedor ON insumos(proveedor_id);

-- ============================================================
-- RECETAS (BOM) — qué insumos lleva cada producto
-- ============================================================
CREATE TABLE recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo una receta activa por producto
CREATE UNIQUE INDEX idx_recetas_producto_activa
  ON recetas(producto_id) WHERE activa = true;

CREATE TABLE receta_insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id UUID NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  cantidad NUMERIC(12,4) NOT NULL DEFAULT 1,
  notas TEXT
);

CREATE INDEX idx_receta_insumos_receta ON receta_insumos(receta_id);

-- ============================================================
-- MOVIMIENTOS DE STOCK — trazabilidad completa
-- ============================================================
CREATE TABLE movimientos_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  tipo tipo_movimiento_stock NOT NULL,
  cantidad NUMERIC(12,2) NOT NULL,
  costo_unitario NUMERIC(12,2),
  stock_anterior NUMERIC(12,2) NOT NULL,
  stock_posterior NUMERIC(12,2) NOT NULL,
  referencia_tipo referencia_movimiento,
  referencia_id UUID,
  notas TEXT,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_movimientos_insumo ON movimientos_stock(insumo_id);
CREATE INDEX idx_movimientos_tipo ON movimientos_stock(tipo);
CREATE INDEX idx_movimientos_referencia ON movimientos_stock(referencia_tipo, referencia_id);

-- ============================================================
-- RPC: registrar movimiento con lock para atomicidad
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_movimiento_stock(
  p_insumo_id UUID,
  p_tipo tipo_movimiento_stock,
  p_cantidad NUMERIC,
  p_referencia_tipo referencia_movimiento DEFAULT NULL,
  p_referencia_id UUID DEFAULT NULL,
  p_notas TEXT DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
) RETURNS movimientos_stock AS $$
DECLARE
  v_insumo insumos%ROWTYPE;
  v_stock_anterior NUMERIC(12,2);
  v_stock_posterior NUMERIC(12,2);
  v_movimiento movimientos_stock%ROWTYPE;
BEGIN
  -- Lock the insumo row
  SELECT * INTO v_insumo FROM insumos WHERE id = p_insumo_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo % no encontrado', p_insumo_id;
  END IF;

  v_stock_anterior := v_insumo.stock_actual;

  -- Calculate new stock
  IF p_tipo = 'entrada' THEN
    v_stock_posterior := v_stock_anterior + p_cantidad;
  ELSIF p_tipo IN ('salida', 'devolucion') THEN
    v_stock_posterior := v_stock_anterior - p_cantidad;
  ELSIF p_tipo = 'ajuste' THEN
    -- For adjustments, cantidad IS the new stock level
    v_stock_posterior := p_cantidad;
    -- Override cantidad to be the delta for the record
    p_cantidad := ABS(p_cantidad - v_stock_anterior);
  END IF;

  -- Update insumo stock
  UPDATE insumos SET stock_actual = v_stock_posterior WHERE id = p_insumo_id;

  -- Insert movement record
  INSERT INTO movimientos_stock (
    insumo_id, tipo, cantidad, costo_unitario,
    stock_anterior, stock_posterior,
    referencia_tipo, referencia_id, notas, usuario_id
  ) VALUES (
    p_insumo_id, p_tipo, p_cantidad, v_insumo.costo_unitario,
    v_stock_anterior, v_stock_posterior,
    p_referencia_tipo, p_referencia_id, p_notas, p_usuario_id
  ) RETURNING * INTO v_movimiento;

  RETURN v_movimiento;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ALTER: vincular items_compra con insumos
-- ============================================================
ALTER TABLE items_compra ADD COLUMN insumo_id UUID REFERENCES insumos(id) ON DELETE SET NULL;
ALTER TABLE proveedores_productos ADD COLUMN insumo_id UUID REFERENCES insumos(id) ON DELETE SET NULL;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE receta_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_stock ENABLE ROW LEVEL SECURITY;

-- Lectura para todos
CREATE POLICY "insumos_select" ON insumos FOR SELECT TO authenticated USING (true);
CREATE POLICY "recetas_select" ON recetas FOR SELECT TO authenticated USING (true);
CREATE POLICY "receta_insumos_select" ON receta_insumos FOR SELECT TO authenticated USING (true);
CREATE POLICY "movimientos_stock_select" ON movimientos_stock FOR SELECT TO authenticated USING (true);

-- Escritura admin y operaciones
CREATE POLICY "insumos_insert" ON insumos FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "insumos_update" ON insumos FOR UPDATE TO authenticated USING (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "insumos_delete" ON insumos FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

CREATE POLICY "recetas_insert" ON recetas FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "recetas_update" ON recetas FOR UPDATE TO authenticated USING (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "recetas_delete" ON recetas FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

CREATE POLICY "receta_insumos_insert" ON receta_insumos FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "receta_insumos_update" ON receta_insumos FOR UPDATE TO authenticated USING (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "receta_insumos_delete" ON receta_insumos FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

CREATE POLICY "movimientos_stock_insert" ON movimientos_stock FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'operaciones'));

-- ============================================================
-- SEED: insumos conocidos
-- ============================================================
INSERT INTO insumos (nombre, tipo, unidad, notas) VALUES
  ('Eco cuero', 'material', 'metros', 'Planchas de eco cuero para etiquetas y accesorios'),
  ('Madera cortada', 'material', 'unidades', 'Piezas de madera para personalización'),
  ('Stickers SER', 'material', 'unidades', 'Stickers con logo SER'),
  ('Stickers personalizados', 'material', 'unidades', 'Stickers con logo del cliente'),
  ('Caja regalo', 'material', 'unidades', 'Cajas para empaque'),
  ('Pluribol', 'material', 'metros', 'Plástico burbuja para protección'),
  ('Cartón refuerzo', 'material', 'unidades', 'Cartón para dar estructura a textiles'),
  ('Tarjetón agradecimiento', 'material', 'unidades', 'Tarjeta de agradecimiento para incluir en pedido'),
  ('Confección Olga', 'servicio', 'unidades', 'Servicio de costura de etiquetas eco cuero en textiles'),
  ('Impresión Masterprint', 'servicio', 'unidades', 'Servicio de impresión de stickers');

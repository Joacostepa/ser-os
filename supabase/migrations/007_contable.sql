-- ============================================================
-- 007: Módulo Contable — Plan de cuentas, asientos, gastos
-- ============================================================

-- ============================================================
-- TABLAS
-- ============================================================

-- Plan de cuentas
CREATE TABLE cuentas (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('activo','pasivo','patrimonio','ingreso','costo','gasto')),
  naturaleza VARCHAR(10) NOT NULL CHECK (naturaleza IN ('deudora','acreedora')),
  cuenta_padre_id INT REFERENCES cuentas(id),
  nivel INT NOT NULL CHECK (nivel BETWEEN 1 AND 3),
  activa BOOLEAN DEFAULT true,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cuentas_tipo ON cuentas(tipo);
CREATE INDEX idx_cuentas_codigo ON cuentas(codigo);

-- Asientos contables
CREATE TABLE asientos (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('venta','cobro','compra','pago_proveedor','gasto','ajuste')),
  referencia_tipo VARCHAR(30),
  referencia_id UUID,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  anulado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_asientos_fecha ON asientos(fecha);
CREATE INDEX idx_asientos_tipo ON asientos(tipo);
CREATE INDEX idx_asientos_referencia ON asientos(referencia_tipo, referencia_id);

-- Movimientos contables (líneas del asiento)
CREATE TABLE movimientos_contables (
  id SERIAL PRIMARY KEY,
  asiento_id INT NOT NULL REFERENCES asientos(id) ON DELETE CASCADE,
  cuenta_id INT NOT NULL REFERENCES cuentas(id),
  debe DECIMAL(15,2) DEFAULT 0,
  haber DECIMAL(15,2) DEFAULT 0,
  descripcion VARCHAR(255)
);

CREATE INDEX idx_mov_contables_asiento ON movimientos_contables(asiento_id);
CREATE INDEX idx_mov_contables_cuenta ON movimientos_contables(cuenta_id);

-- Gastos operativos
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion VARCHAR(255) NOT NULL,
  cuenta_id INT NOT NULL REFERENCES cuentas(id),
  monto DECIMAL(15,2) NOT NULL,
  fecha DATE NOT NULL,
  pagado BOOLEAN DEFAULT false,
  fecha_pago DATE,
  metodo_pago VARCHAR(50),
  recurrente BOOLEAN DEFAULT false,
  frecuencia VARCHAR(20),
  proximo_vencimiento DATE,
  comprobante_url TEXT,
  observaciones TEXT,
  asiento_id INT REFERENCES asientos(id),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gastos_fecha ON gastos(fecha);
CREATE INDEX idx_gastos_cuenta ON gastos(cuenta_id);
CREATE INDEX idx_gastos_pagado ON gastos(pagado);

-- Trigger updated_at para gastos
CREATE TRIGGER trg_gastos_updated_at
  BEFORE UPDATE ON gastos
  FOR EACH ROW EXECUTE FUNCTION update_compras_updated_at();

-- ============================================================
-- RPC: Crear asiento contable atómico
-- ============================================================
CREATE OR REPLACE FUNCTION crear_asiento_contable(
  p_fecha DATE,
  p_descripcion VARCHAR,
  p_tipo VARCHAR,
  p_referencia_tipo VARCHAR DEFAULT NULL,
  p_referencia_id UUID DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL,
  p_lineas JSONB DEFAULT '[]'
) RETURNS INT AS $$
DECLARE
  v_asiento_id INT;
  v_total_debe DECIMAL(15,2) := 0;
  v_total_haber DECIMAL(15,2) := 0;
  v_linea JSONB;
  v_cuenta_id INT;
BEGIN
  -- Validate lines exist
  IF jsonb_array_length(p_lineas) = 0 THEN
    RAISE EXCEPTION 'El asiento debe tener al menos una línea';
  END IF;

  -- Calculate totals
  FOR v_linea IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    v_total_debe := v_total_debe + COALESCE((v_linea->>'debe')::DECIMAL, 0);
    v_total_haber := v_total_haber + COALESCE((v_linea->>'haber')::DECIMAL, 0);
  END LOOP;

  -- Validate balance
  IF ABS(v_total_debe - v_total_haber) > 0.01 THEN
    RAISE EXCEPTION 'Asiento descuadrado: debe=%, haber=%', v_total_debe, v_total_haber;
  END IF;

  -- Insert header
  INSERT INTO asientos (fecha, descripcion, tipo, referencia_tipo, referencia_id, usuario_id)
  VALUES (p_fecha, p_descripcion, p_tipo, p_referencia_tipo, p_referencia_id, p_usuario_id)
  RETURNING id INTO v_asiento_id;

  -- Insert lines
  FOR v_linea IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    SELECT id INTO v_cuenta_id FROM cuentas WHERE codigo = v_linea->>'cuenta_codigo';
    IF v_cuenta_id IS NULL THEN
      RAISE EXCEPTION 'Cuenta no encontrada: %', v_linea->>'cuenta_codigo';
    END IF;

    INSERT INTO movimientos_contables (asiento_id, cuenta_id, debe, haber, descripcion)
    VALUES (
      v_asiento_id,
      v_cuenta_id,
      COALESCE((v_linea->>'debe')::DECIMAL, 0),
      COALESCE((v_linea->>'haber')::DECIMAL, 0),
      v_linea->>'descripcion'
    );
  END LOOP;

  RETURN v_asiento_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RPC: Anular asiento (crea reverso)
-- ============================================================
CREATE OR REPLACE FUNCTION anular_asiento(p_asiento_id INT) RETURNS INT AS $$
DECLARE
  v_asiento asientos%ROWTYPE;
  v_reverso_id INT;
BEGIN
  SELECT * INTO v_asiento FROM asientos WHERE id = p_asiento_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Asiento no encontrado'; END IF;
  IF v_asiento.anulado THEN RAISE EXCEPTION 'Asiento ya está anulado'; END IF;

  -- Mark original as annulled
  UPDATE asientos SET anulado = true WHERE id = p_asiento_id;

  -- Create reverse entry
  INSERT INTO asientos (fecha, descripcion, tipo, referencia_tipo, referencia_id, usuario_id)
  VALUES (CURRENT_DATE, 'ANULACIÓN: ' || v_asiento.descripcion, 'ajuste', v_asiento.referencia_tipo, v_asiento.referencia_id, v_asiento.usuario_id)
  RETURNING id INTO v_reverso_id;

  -- Reverse all lines (swap debe/haber)
  INSERT INTO movimientos_contables (asiento_id, cuenta_id, debe, haber, descripcion)
  SELECT v_reverso_id, cuenta_id, haber, debe, 'Reverso: ' || COALESCE(descripcion, '')
  FROM movimientos_contables WHERE asiento_id = p_asiento_id;

  RETURN v_reverso_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE asientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_contables ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cuentas_select" ON cuentas FOR SELECT TO authenticated USING (true);
CREATE POLICY "cuentas_admin" ON cuentas FOR ALL TO authenticated USING (get_user_rol() = 'admin');

CREATE POLICY "asientos_select" ON asientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "asientos_insert" ON asientos FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'contabilidad'));

CREATE POLICY "mov_contables_select" ON movimientos_contables FOR SELECT TO authenticated USING (true);
CREATE POLICY "mov_contables_insert" ON movimientos_contables FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'contabilidad'));

CREATE POLICY "gastos_select" ON gastos FOR SELECT TO authenticated USING (true);
CREATE POLICY "gastos_insert" ON gastos FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'operaciones', 'contabilidad'));
CREATE POLICY "gastos_update" ON gastos FOR UPDATE TO authenticated USING (get_user_rol() IN ('admin', 'operaciones', 'contabilidad'));
CREATE POLICY "gastos_delete" ON gastos FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

-- ============================================================
-- SEED: Plan de cuentas completo
-- ============================================================

-- Nivel 1: Grupos
INSERT INTO cuentas (codigo, nombre, tipo, naturaleza, nivel) VALUES
  ('1',   'ACTIVO',      'activo',      'deudora',    1),
  ('2',   'PASIVO',      'pasivo',      'acreedora',  1),
  ('3',   'PATRIMONIO',  'patrimonio',  'acreedora',  1),
  ('4',   'INGRESOS',    'ingreso',     'acreedora',  1),
  ('5',   'COSTOS',      'costo',       'deudora',    1),
  ('6',   'GASTOS OPERATIVOS', 'gasto', 'deudora',    1);

-- Nivel 2: Subgrupos
INSERT INTO cuentas (codigo, nombre, tipo, naturaleza, cuenta_padre_id, nivel) VALUES
  ('1.1', 'Activo Corriente',        'activo',      'deudora',   (SELECT id FROM cuentas WHERE codigo='1'), 2),
  ('2.1', 'Pasivo Corriente',        'pasivo',      'acreedora', (SELECT id FROM cuentas WHERE codigo='2'), 2),
  ('3.1', 'Patrimonio Neto',         'patrimonio',  'acreedora', (SELECT id FROM cuentas WHERE codigo='3'), 2),
  ('4.1', 'Ingresos por Ventas',     'ingreso',     'acreedora', (SELECT id FROM cuentas WHERE codigo='4'), 2),
  ('4.2', 'Otros Ingresos',          'ingreso',     'acreedora', (SELECT id FROM cuentas WHERE codigo='4'), 2),
  ('5.1', 'Costo de Mercadería Vendida', 'costo',   'deudora',   (SELECT id FROM cuentas WHERE codigo='5'), 2),
  ('6.1', 'Gastos de Personal',      'gasto',       'deudora',   (SELECT id FROM cuentas WHERE codigo='6'), 2),
  ('6.2', 'Gastos de Operación',     'gasto',       'deudora',   (SELECT id FROM cuentas WHERE codigo='6'), 2),
  ('6.3', 'Gastos Financieros',      'gasto',       'deudora',   (SELECT id FROM cuentas WHERE codigo='6'), 2);

-- Nivel 3: Cuentas imputables — ACTIVO
INSERT INTO cuentas (codigo, nombre, tipo, naturaleza, cuenta_padre_id, nivel, descripcion) VALUES
  ('1.1.1', 'Caja / Bancos',              'activo', 'deudora', (SELECT id FROM cuentas WHERE codigo='1.1'), 3, 'Dinero disponible en caja y bancos'),
  ('1.1.2', 'Cuentas a Cobrar (Clientes)', 'activo', 'deudora', (SELECT id FROM cuentas WHERE codigo='1.1'), 3, 'Saldos pendientes de cobro a clientes'),
  ('1.1.3', 'Inventario (Mercadería)',     'activo', 'deudora', (SELECT id FROM cuentas WHERE codigo='1.1'), 3, 'Valor del stock de mercadería e insumos'),
  ('1.1.4', 'Anticipos a Proveedores',     'activo', 'deudora', (SELECT id FROM cuentas WHERE codigo='1.1'), 3, 'Anticipos entregados a proveedores');

-- Nivel 3: PASIVO
INSERT INTO cuentas (codigo, nombre, tipo, naturaleza, cuenta_padre_id, nivel, descripcion) VALUES
  ('2.1.1', 'Cuentas a Pagar (Proveedores)', 'pasivo', 'acreedora', (SELECT id FROM cuentas WHERE codigo='2.1'), 3, 'Deudas con proveedores'),
  ('2.1.2', 'Anticipos de Clientes',          'pasivo', 'acreedora', (SELECT id FROM cuentas WHERE codigo='2.1'), 3, 'Señas recibidas de clientes antes de confirmar venta'),
  ('2.1.3', 'Gastos Pendientes de Pago',      'pasivo', 'acreedora', (SELECT id FROM cuentas WHERE codigo='2.1'), 3, 'Gastos devengados no pagados');

-- Nivel 3: PATRIMONIO
INSERT INTO cuentas (codigo, nombre, tipo, naturaleza, cuenta_padre_id, nivel) VALUES
  ('3.1.1', 'Capital',               'patrimonio', 'acreedora', (SELECT id FROM cuentas WHERE codigo='3.1'), 3),
  ('3.1.2', 'Resultados Acumulados', 'patrimonio', 'acreedora', (SELECT id FROM cuentas WHERE codigo='3.1'), 3);

-- Nivel 3: INGRESOS
INSERT INTO cuentas (codigo, nombre, tipo, naturaleza, cuenta_padre_id, nivel) VALUES
  ('4.1.1', 'Ventas Mayoristas',    'ingreso', 'acreedora', (SELECT id FROM cuentas WHERE codigo='4.1'), 3),
  ('4.1.2', 'Ventas Minoristas',    'ingreso', 'acreedora', (SELECT id FROM cuentas WHERE codigo='4.1'), 3),
  ('4.2.1', 'Descuentos Obtenidos', 'ingreso', 'acreedora', (SELECT id FROM cuentas WHERE codigo='4.2'), 3),
  ('4.2.2', 'Otros Ingresos',       'ingreso', 'acreedora', (SELECT id FROM cuentas WHERE codigo='4.2'), 3);

-- Nivel 3: COSTOS
INSERT INTO cuentas (codigo, nombre, tipo, naturaleza, cuenta_padre_id, nivel) VALUES
  ('5.1.1', 'Costo de Productos Vendidos', 'costo', 'deudora', (SELECT id FROM cuentas WHERE codigo='5.1'), 3),
  ('5.1.2', 'Costo de Personalización',     'costo', 'deudora', (SELECT id FROM cuentas WHERE codigo='5.1'), 3),
  ('5.1.3', 'Costo de Tercerización',       'costo', 'deudora', (SELECT id FROM cuentas WHERE codigo='5.1'), 3),
  ('5.1.4', 'Costo de Packaging',           'costo', 'deudora', (SELECT id FROM cuentas WHERE codigo='5.1'), 3);

-- Nivel 3: GASTOS DE PERSONAL
INSERT INTO cuentas (codigo, nombre, tipo, naturaleza, cuenta_padre_id, nivel) VALUES
  ('6.1.1', 'Sueldos y Jornales',         'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.1'), 3),
  ('6.1.2', 'Cargas Sociales',            'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.1'), 3),
  ('6.1.3', 'Honorarios Profesionales',   'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.1'), 3);

-- Nivel 3: GASTOS DE OPERACIÓN
INSERT INTO cuentas (codigo, nombre, tipo, naturaleza, cuenta_padre_id, nivel) VALUES
  ('6.2.1',  'Alquiler',                    'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.2'), 3),
  ('6.2.2',  'Servicios',                   'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.2'), 3),
  ('6.2.3',  'Packaging y Embalaje',        'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.2'), 3),
  ('6.2.4',  'Envíos y Fletes',             'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.2'), 3),
  ('6.2.5',  'Comisiones',                  'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.2'), 3),
  ('6.2.6',  'Insumos de Oficina',          'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.2'), 3),
  ('6.2.7',  'Mantenimiento y Reparaciones','gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.2'), 3),
  ('6.2.8',  'Seguros',                     'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.2'), 3),
  ('6.2.9',  'Impuestos y Tasas',           'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.2'), 3),
  ('6.2.10', 'Publicidad y Marketing',      'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.2'), 3),
  ('6.2.11', 'Software y Suscripciones',    'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.2'), 3),
  ('6.2.12', 'Gastos Bancarios',            'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.2'), 3),
  ('6.2.13', 'Otros Gastos Operativos',     'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.2'), 3);

-- Nivel 3: GASTOS FINANCIEROS
INSERT INTO cuentas (codigo, nombre, tipo, naturaleza, cuenta_padre_id, nivel) VALUES
  ('6.3.1', 'Intereses Pagados',       'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.3'), 3),
  ('6.3.2', 'Diferencia de Cambio',    'gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.3'), 3),
  ('6.3.3', 'Otros Gastos Financieros','gasto', 'deudora', (SELECT id FROM cuentas WHERE codigo='6.3'), 3);

-- ============================================================
-- 003: Proveedores + Productos de Proveedor
-- ============================================================

-- Enums
CREATE TYPE calificacion_proveedor AS ENUM ('excelente', 'bueno', 'regular', 'malo');
CREATE TYPE rubro_proveedor AS ENUM ('textil', 'imprenta', 'confeccion', 'madera', 'cuero', 'packaging', 'otro');

-- Tabla principal
CREATE TABLE proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  contacto_principal TEXT,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  rubro rubro_proveedor NOT NULL DEFAULT 'otro',
  condiciones_pago TEXT,
  tiempo_entrega_dias INT,
  calificacion calificacion_proveedor NOT NULL DEFAULT 'bueno',
  notas TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proveedores_activo ON proveedores(activo);
CREATE INDEX idx_proveedores_rubro ON proveedores(rubro);

-- Qué productos/insumos provee cada proveedor
CREATE TABLE proveedores_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  precio_referencia NUMERIC(12,2),
  moneda TEXT NOT NULL DEFAULT 'ARS',
  ultima_compra TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(proveedor_id, producto_id)
);

CREATE INDEX idx_proveedores_productos_proveedor ON proveedores_productos(proveedor_id);

-- Vincular pagos con proveedores
ALTER TABLE pagos ADD COLUMN proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL;
CREATE INDEX idx_pagos_proveedor ON pagos(proveedor_id);

-- RLS
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores_productos ENABLE ROW LEVEL SECURITY;

-- Lectura para todos los autenticados
CREATE POLICY "proveedores_select" ON proveedores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "proveedores_productos_select" ON proveedores_productos
  FOR SELECT TO authenticated USING (true);

-- Escritura solo admin y operaciones
CREATE POLICY "proveedores_insert" ON proveedores
  FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "proveedores_update" ON proveedores
  FOR UPDATE TO authenticated USING (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "proveedores_delete" ON proveedores
  FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

CREATE POLICY "proveedores_productos_insert" ON proveedores_productos
  FOR INSERT TO authenticated WITH CHECK (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "proveedores_productos_update" ON proveedores_productos
  FOR UPDATE TO authenticated USING (get_user_rol() IN ('admin', 'operaciones'));
CREATE POLICY "proveedores_productos_delete" ON proveedores_productos
  FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

-- Seed proveedores conocidos
INSERT INTO proveedores (nombre, contacto_principal, rubro, calificacion, notas) VALUES
  ('Gerardo', 'Gerardo', 'cuero', 'bueno', 'Eco cuero y maderas. Proveedor principal para personalización.'),
  ('Masterprint', NULL, 'imprenta', 'bueno', 'Stickers y etiquetas adhesivas.'),
  ('Olga', 'Olga', 'confeccion', 'bueno', 'Modista. Confección de etiquetas eco cuero en textiles.');

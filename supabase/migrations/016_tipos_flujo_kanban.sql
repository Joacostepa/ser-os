-- ============================================================
-- 016: Tipos de pedido + Flujo configurable + Kanban configurable
-- ============================================================

-- Agregar nuevos valores al enum tipo_pedido
ALTER TYPE tipo_pedido ADD VALUE IF NOT EXISTS 'logo_ser';
ALTER TYPE tipo_pedido ADD VALUE IF NOT EXISTS 'marca_blanca';
ALTER TYPE tipo_pedido ADD VALUE IF NOT EXISTS 'sin_clasificar';

-- ============================================================
-- Config etapas — configuración de cada estado
-- ============================================================
CREATE TABLE IF NOT EXISTS config_etapas (
  id SERIAL PRIMARY KEY,
  estado_interno VARCHAR(30) NOT NULL UNIQUE,
  label_default VARCHAR(50) NOT NULL,
  label_custom VARCHAR(50),
  activo_logo_ser BOOLEAN NOT NULL DEFAULT true,
  activo_marca_blanca BOOLEAN NOT NULL DEFAULT true,
  activo_personalizado BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL,
  badge_color_bg VARCHAR(30) NOT NULL,
  badge_color_text VARCHAR(30) NOT NULL,
  icono VARCHAR(30),
  visible_en_portal BOOLEAN NOT NULL DEFAULT true,
  label_portal VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE config_etapas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_etapas_select" ON config_etapas FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_etapas_admin" ON config_etapas FOR ALL TO authenticated USING (get_user_rol() = 'admin');

-- Seed etapas
INSERT INTO config_etapas (estado_interno, label_default, activo_logo_ser, activo_marca_blanca, activo_personalizado, orden, badge_color_bg, badge_color_text, icono, visible_en_portal, label_portal) VALUES
  ('nuevo',                'Nuevo',                 true,  true,  true,  1,  'bg-stone-100',  'text-stone-600',  'Package',      true,  'Pedido recibido'),
  ('pendiente_de_sena',    'Pendiente de seña',     true,  true,  true,  2,  'bg-amber-50',   'text-amber-700',  'Clock',        true,  'Pendiente de pago'),
  ('habilitado',           'Habilitado',            true,  true,  true,  3,  'bg-blue-50',    'text-blue-700',   'CheckCircle',  true,  'Confirmado'),
  ('en_prearmado',         'En pre-armado',         true,  true,  true,  4,  'bg-blue-50',    'text-blue-700',   'Wrench',       true,  'En producción'),
  ('bloqueado',            'Bloqueado',             true,  true,  true,  5,  'bg-red-50',     'text-red-700',    'AlertCircle',  false, NULL),
  ('listo_para_armar',     'Listo para armar',      true,  true,  true,  6,  'bg-blue-50',    'text-blue-700',   'CheckSquare',  true,  'En producción'),
  ('en_armado',            'En armado',             true,  true,  true,  7,  'bg-violet-50',  'text-violet-700', 'PackageCheck', true,  'En preparación'),
  ('armado_completo',      'Armado completo',       true,  true,  true,  8,  'bg-violet-50',  'text-violet-700', 'PackageCheck', true,  'Casi listo'),
  ('pendiente_de_cobro',   'Pendiente de cobro',    true,  true,  true,  9,  'bg-amber-50',   'text-amber-700',  'DollarSign',   true,  'Pendiente de pago del saldo'),
  ('listo_para_despachar', 'Listo para despachar',  true,  true,  true,  10, 'bg-teal-50',    'text-teal-700',   'Truck',        true,  'Listo para envío'),
  ('despachado',           'Despachado',            true,  true,  true,  11, 'bg-green-50',   'text-green-700',  'Truck',        true,  'Enviado'),
  ('entregado',            'Entregado',             true,  true,  true,  12, 'bg-green-50',   'text-green-800',  'CheckCircle2', true,  'Entregado'),
  ('cancelado',            'Cancelado',             true,  true,  true,  13, 'bg-red-50',     'text-red-700',    'XCircle',      false, NULL),
  ('cerrado',              'Cerrado',               true,  true,  true,  14, 'bg-stone-100',  'text-stone-500',  'Archive',      false, NULL)
ON CONFLICT (estado_interno) DO NOTHING;

-- ============================================================
-- Config Kanban columnas
-- ============================================================
CREATE TABLE IF NOT EXISTS config_kanban_columnas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  orden INT NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#78716c',
  icono VARCHAR(30),
  estados JSONB NOT NULL,
  colapsada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE config_kanban_columnas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_kanban_select" ON config_kanban_columnas FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_kanban_admin" ON config_kanban_columnas FOR ALL TO authenticated USING (get_user_rol() = 'admin');

-- Seed Kanban columnas
INSERT INTO config_kanban_columnas (nombre, orden, color, icono, estados) VALUES
  ('Nuevos',         1, '#78716c', 'Package',     '["nuevo"]'),
  ('Pendiente pago', 2, '#d97706', 'Clock',       '["pendiente_de_sena"]'),
  ('Pre-armado',     3, '#2563eb', 'Wrench',      '["habilitado", "en_prearmado", "listo_para_armar"]'),
  ('Armado',         4, '#7c3aed', 'PackageCheck', '["en_armado", "armado_completo"]'),
  ('Despacho',       5, '#059669', 'Truck',        '["pendiente_de_cobro", "listo_para_despachar"]')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Migrar tipos de pedido existentes
-- ============================================================
UPDATE pedidos SET tipo = 'logo_ser' WHERE tipo = 'estandar';
UPDATE pedidos SET tipo = 'sin_clasificar' WHERE tipo IS NULL OR tipo = '';

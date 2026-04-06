-- ============================================================
-- 030: Cancelación de pedidos — campos + saldos a favor
-- ============================================================

-- Campos de cancelación en pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cancelado_en TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cancelado_por UUID REFERENCES usuarios(id);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cancelacion_motivo VARCHAR(255);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cancelacion_notas TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cancelacion_origen VARCHAR(30);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cancelacion_tiene_pagos BOOLEAN DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cancelacion_saldo_favor DECIMAL(15,2) DEFAULT 0;

-- Saldos a favor de clientes (generados al cancelar pedidos con pagos)
CREATE TABLE IF NOT EXISTS saldos_favor_clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  pedido_origen_id UUID NOT NULL REFERENCES pedidos(id),
  monto_original DECIMAL(15,2) NOT NULL,
  monto_disponible DECIMAL(15,2) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  devuelto_en TIMESTAMPTZ,
  devuelto_metodo VARCHAR(50),
  devuelto_por UUID REFERENCES usuarios(id),
  devuelto_notas TEXT,
  usado_en_pedido_id UUID REFERENCES pedidos(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saldos_cliente ON saldos_favor_clientes(cliente_id, estado);

-- RLS
ALTER TABLE saldos_favor_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saldos_favor_select" ON saldos_favor_clientes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "saldos_favor_insert" ON saldos_favor_clientes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "saldos_favor_update" ON saldos_favor_clientes
  FOR UPDATE TO authenticated
  USING (
    (SELECT rol FROM usuarios WHERE auth_id = auth.uid()) IN ('admin', 'contabilidad')
  );

-- Permitir estado 'cancelada' en tareas (el enum solo tiene pendiente/en_proceso/terminada/bloqueada)
-- Cambiamos a VARCHAR para flexibilidad
ALTER TABLE tareas ALTER COLUMN estado TYPE VARCHAR(30);
ALTER TABLE tareas ALTER COLUMN estado SET DEFAULT 'pendiente';

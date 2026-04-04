-- ============================================================
-- 010: Pagos v2 — tipo, origen, recibo, asientos vinculados
-- ============================================================

-- ALTERs a pagos
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS tipo_pago VARCHAR(20);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS origen VARCHAR(20) DEFAULT 'manual';
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS referencia_externa VARCHAR(100);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS numero_recibo VARCHAR(20);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS recibo_url TEXT;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS asiento_venta_id INT;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS asiento_cobro_id INT;

CREATE INDEX IF NOT EXISTS idx_pagos_referencia_ext ON pagos(referencia_externa);

-- ALTERs a pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) DEFAULT 'pendiente';

-- Sequence para recibos
CREATE SEQUENCE IF NOT EXISTS pagos_recibo_seq START 1;

CREATE OR REPLACE FUNCTION generar_numero_recibo() RETURNS VARCHAR AS $$
DECLARE
  v_num INT;
BEGIN
  v_num := nextval('pagos_recibo_seq');
  RETURN 'REC-' || LPAD(v_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 029: Protección contra pagos duplicados
-- ============================================================

-- Payment ID de TN para idempotencia de webhooks
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS tienda_nube_payment_id VARCHAR(100);

-- Origen del pago (manual o webhook)
-- La columna ya podría existir como parte del concepto, pero agregamos explícitamente
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS origen VARCHAR(30) DEFAULT 'manual';

-- Índice único para evitar procesar el mismo pago de TN dos veces
CREATE UNIQUE INDEX IF NOT EXISTS idx_pagos_tn_payment
  ON pagos(tienda_nube_payment_id)
  WHERE tienda_nube_payment_id IS NOT NULL;

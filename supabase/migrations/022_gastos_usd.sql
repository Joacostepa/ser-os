-- ============================================================
-- 022: Gastos — cotización USD (snapshot blue sobre monto neto)
-- ============================================================

ALTER TABLE gastos ADD COLUMN IF NOT EXISTS cotizacion_usd NUMERIC(12,2);
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS cotizacion_tipo TEXT DEFAULT 'blue';
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS monto_usd NUMERIC(12,2);

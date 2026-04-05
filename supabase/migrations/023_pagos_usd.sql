-- ============================================================
-- 023: Pagos y pagos_proveedor — TC dólar blue
-- ============================================================

ALTER TABLE pagos ADD COLUMN IF NOT EXISTS tc_dolar DECIMAL(10,2);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS monto_usd DECIMAL(15,2);

ALTER TABLE pagos_proveedor ADD COLUMN IF NOT EXISTS tc_dolar DECIMAL(10,2);
ALTER TABLE pagos_proveedor ADD COLUMN IF NOT EXISTS monto_usd DECIMAL(15,2);

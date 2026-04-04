-- ============================================================
-- 006: Cotización USD — snapshot al momento de la operación
-- ============================================================

-- Pedidos: guardar cotización y monto en USD
ALTER TABLE pedidos ADD COLUMN cotizacion_usd NUMERIC(12,2);
ALTER TABLE pedidos ADD COLUMN cotizacion_tipo TEXT DEFAULT 'blue';
ALTER TABLE pedidos ADD COLUMN monto_total_usd NUMERIC(12,2);

-- Compras: guardar cotización y monto en USD
ALTER TABLE compras ADD COLUMN cotizacion_usd NUMERIC(12,2);
ALTER TABLE compras ADD COLUMN cotizacion_tipo TEXT DEFAULT 'blue';
ALTER TABLE compras ADD COLUMN monto_total_usd NUMERIC(12,2);

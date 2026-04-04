-- ============================================================
-- 020: Pedidos manuales — canal + número interno
-- ============================================================

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS canal VARCHAR(30) DEFAULT 'tienda_nube';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero_interno VARCHAR(20);

-- Backfill: pedidos existentes son de TN
UPDATE pedidos SET canal = 'tienda_nube' WHERE canal IS NULL;

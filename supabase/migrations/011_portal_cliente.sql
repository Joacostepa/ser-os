-- ============================================================
-- 011: Portal de seguimiento del cliente
-- ============================================================

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS codigo_seguimiento_portal VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_codigo_portal ON pedidos(codigo_seguimiento_portal) WHERE codigo_seguimiento_portal IS NOT NULL;

-- Copy existing codigo_seguimiento to portal code for existing pedidos
UPDATE pedidos SET codigo_seguimiento_portal = codigo_seguimiento WHERE codigo_seguimiento_portal IS NULL AND codigo_seguimiento IS NOT NULL;

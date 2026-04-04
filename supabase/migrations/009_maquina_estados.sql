-- ============================================================
-- 009: Máquina de estados — campos adicionales en pedidos
-- ============================================================

-- Agregar nuevos valores al enum estado_interno
-- PostgreSQL requires ALTER TYPE ... ADD VALUE for each new value
ALTER TYPE estado_interno ADD VALUE IF NOT EXISTS 'habilitado';
ALTER TYPE estado_interno ADD VALUE IF NOT EXISTS 'bloqueado';
ALTER TYPE estado_interno ADD VALUE IF NOT EXISTS 'pendiente_de_cobro';
ALTER TYPE estado_interno ADD VALUE IF NOT EXISTS 'entregado';

-- Nuevos campos en pedidos para la máquina de estados
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS subestado VARCHAR(30);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado_anterior VARCHAR(30);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMPTZ;

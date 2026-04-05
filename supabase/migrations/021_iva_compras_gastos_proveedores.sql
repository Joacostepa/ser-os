-- ============================================================
-- 021: IVA en compras, gastos y proveedores
-- ============================================================

-- Proveedores: condición fiscal + CUIT
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS condicion_fiscal VARCHAR(30) DEFAULT 'responsable_inscripto';
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS cuit VARCHAR(20);

-- Compras: IVA tracking
ALTER TABLE compras ADD COLUMN IF NOT EXISTS incluye_iva BOOLEAN DEFAULT true;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS tasa_iva DECIMAL(5,2) DEFAULT 0.21;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS subtotal_neto DECIMAL(15,2);
ALTER TABLE compras ADD COLUMN IF NOT EXISTS monto_iva DECIMAL(15,2);

-- Gastos: IVA + proveedor link
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS incluye_iva BOOLEAN DEFAULT false;
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS tasa_iva DECIMAL(5,2) DEFAULT 0.21;
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS monto_neto DECIMAL(15,2);
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS monto_iva DECIMAL(15,2);
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gastos_proveedor ON gastos(proveedor_id);

-- Backfill proveedores
UPDATE proveedores SET condicion_fiscal = 'responsable_inscripto' WHERE condicion_fiscal IS NULL;

-- Backfill compras (existentes no tenían IVA tracking)
UPDATE compras SET incluye_iva = false, subtotal_neto = subtotal - COALESCE(descuento, 0), monto_iva = 0 WHERE subtotal_neto IS NULL;

-- Backfill gastos
UPDATE gastos SET monto_neto = monto, monto_iva = 0 WHERE monto_neto IS NULL;

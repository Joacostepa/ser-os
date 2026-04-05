-- ============================================================
-- 027: Mejoras de insumos — campo activo + presentación
-- ============================================================

ALTER TABLE insumos ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS presentacion VARCHAR(30);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS cantidad_presentacion DECIMAL(10,2);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL;
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS notas TEXT;

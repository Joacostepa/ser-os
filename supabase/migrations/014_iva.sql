-- ============================================================
-- 014: Manejo de IVA — campos netos en productos, items y pedidos
-- ============================================================

-- Productos: precio neto + tasa IVA
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_neto DECIMAL(15,2);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tasa_iva DECIMAL(5,2) DEFAULT 0.21;

-- Items pedido: precio neto + IVA por unidad
ALTER TABLE items_pedido ADD COLUMN IF NOT EXISTS precio_neto DECIMAL(15,2);
ALTER TABLE items_pedido ADD COLUMN IF NOT EXISTS iva_unitario DECIMAL(15,2);

-- Pedidos: montos netos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS monto_neto DECIMAL(15,2);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS monto_iva DECIMAL(15,2);

-- Nuevas cuentas contables para IVA
INSERT INTO cuentas (codigo, nombre, tipo, naturaleza, cuenta_padre_id, nivel, descripcion)
VALUES
  ('1.1.5', 'IVA Crédito Fiscal', 'activo', 'deudora', (SELECT id FROM cuentas WHERE codigo='1.1'), 3, 'IVA pagado en compras, deducible'),
  ('2.1.4', 'IVA Débito Fiscal', 'pasivo', 'acreedora', (SELECT id FROM cuentas WHERE codigo='2.1'), 3, 'IVA cobrado en ventas, a pagar a AFIP')
ON CONFLICT (codigo) DO NOTHING;

-- Backfill: calcular precio_neto para productos existentes (21% IVA)
UPDATE productos
SET precio_neto = ROUND(precio_mayorista / 1.21, 2),
    tasa_iva = 0.21
WHERE precio_mayorista IS NOT NULL AND precio_neto IS NULL;

-- Backfill: calcular montos netos para pedidos existentes
UPDATE pedidos
SET monto_neto = ROUND(monto_total / 1.21, 2),
    monto_iva = ROUND(monto_total - (monto_total / 1.21), 2)
WHERE monto_total > 0 AND monto_neto IS NULL;

-- Backfill: calcular precio_neto en items_pedido existentes
UPDATE items_pedido
SET precio_neto = ROUND(precio_unitario / 1.21, 2),
    iva_unitario = ROUND(precio_unitario - (precio_unitario / 1.21), 2)
WHERE precio_unitario > 0 AND precio_neto IS NULL;

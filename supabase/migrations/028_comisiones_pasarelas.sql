-- ============================================================
-- 028: Comisiones de pasarelas de pago
-- ============================================================

-- Configuración editable de tasas de comisión por método de pago
CREATE TABLE comisiones_config (
  id SERIAL PRIMARY KEY,
  metodo_pago VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL,                      -- 'pasarela', 'plataforma', 'manual'
  tasa_porcentaje DECIMAL(6,3) NOT NULL,
  incluye_iva BOOLEAN NOT NULL DEFAULT true,
  tasa_iva DECIMAL(5,2) DEFAULT 0.21,
  comision_fija DECIMAL(10,2) DEFAULT 0,
  comision_tn_adicional BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comisiones calculadas por cada pago
CREATE TABLE comisiones_pedido (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES pedidos(id),
  pago_id UUID REFERENCES pagos(id),

  metodo_pago VARCHAR(50) NOT NULL,
  monto_bruto DECIMAL(15,2) NOT NULL,
  tasa_pasarela DECIMAL(6,3) NOT NULL,
  comision_pasarela_neta DECIMAL(15,2) NOT NULL,
  iva_comision_pasarela DECIMAL(15,2) NOT NULL,
  comision_pasarela_total DECIMAL(15,2) NOT NULL,

  tasa_tn DECIMAL(6,3) DEFAULT 0,
  comision_tn DECIMAL(15,2) DEFAULT 0,

  total_comisiones DECIMAL(15,2) NOT NULL,
  monto_neto_recibido DECIMAL(15,2) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comisiones_pedido ON comisiones_pedido(pedido_id);
CREATE INDEX idx_comisiones_pago ON comisiones_pedido(pago_id);

-- Seed con valores iniciales
INSERT INTO comisiones_config (metodo_pago, nombre, tipo, tasa_porcentaje, incluye_iva, comision_tn_adicional, notas) VALUES
-- Pago Nube
('pago_nube_tarjeta', 'Pago Nube — Tarjeta crédito/débito', 'pasarela', 4.390, false, false, 'Tasa para plan Impulso con retiro en 7 días. Ajustar según plan y plazo.'),
('pago_nube_transferencia', 'Pago Nube — Transferencia', 'pasarela', 1.500, false, false, 'Igual en todos los planes.'),
-- MercadoPago
('mercadopago', 'MercadoPago', 'pasarela', 4.150, false, true, 'Acreditación en 7 días. Además se cobra comisión TN por transacción.'),
-- Otros medios (TN)
('transferencia_directa', 'Transferencia bancaria directa', 'manual', 0, false, true, 'Sin comisión de pasarela. Solo comisión TN.'),
('efectivo', 'Efectivo', 'manual', 0, false, true, 'Sin comisión de pasarela. Solo comisión TN.'),
-- Pedidos manuales (no TN)
('manual_transferencia', 'Transferencia (pedido manual)', 'manual', 0, false, false, 'Pedido cargado desde la app, no pasa por TN.'),
('manual_efectivo', 'Efectivo (pedido manual)', 'manual', 0, false, false, 'Pedido cargado desde la app, no pasa por TN.'),
-- Comisión de TN por transacción
('tienda_nube_transaccion', 'Tienda Nube — Costo por transacción', 'plataforma', 1.000, false, false, 'Plan Impulso: 1%. Ajustar según plan.');

-- RLS
ALTER TABLE comisiones_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE comisiones_pedido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comisiones_config_select" ON comisiones_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "comisiones_config_modify" ON comisiones_config
  FOR ALL TO authenticated
  USING (
    (SELECT rol FROM usuarios WHERE auth_id = auth.uid()) IN ('admin', 'contabilidad')
  )
  WITH CHECK (
    (SELECT rol FROM usuarios WHERE auth_id = auth.uid()) IN ('admin', 'contabilidad')
  );

CREATE POLICY "comisiones_pedido_select" ON comisiones_pedido
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "comisiones_pedido_insert" ON comisiones_pedido
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "comisiones_pedido_update" ON comisiones_pedido
  FOR UPDATE TO authenticated
  USING (
    (SELECT rol FROM usuarios WHERE auth_id = auth.uid()) IN ('admin', 'contabilidad')
  );

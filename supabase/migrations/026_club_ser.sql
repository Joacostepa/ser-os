-- ============================================================
-- 026: Club SER — programa de fidelización mayorista
-- ============================================================

-- Campañas mensuales (debe ir antes de cupones por FK)
CREATE TABLE club_ser_campanas (
  id SERIAL PRIMARY KEY,
  mes INT NOT NULL,
  anio INT NOT NULL,
  nombre VARCHAR(100),
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador',

  total_clientas INT DEFAULT 0,
  activas INT DEFAULT 0,
  inactivas INT DEFAULT 0,
  dormidas INT DEFAULT 0,
  reactivacion INT DEFAULT 0,
  nunca_compro INT DEFAULT 0,
  vip INT DEFAULT 0,
  estandar INT DEFAULT 0,

  cupones_generados INT DEFAULT 0,
  cupones_sincronizados_tn INT DEFAULT 0,
  emails_enviados INT DEFAULT 0,
  emails_error INT DEFAULT 0,

  cupones_usados INT DEFAULT 0,
  tasa_conversion DECIMAL(5,2),
  revenue_generado DECIMAL(15,2),

  aprobado_por UUID REFERENCES usuarios(id),
  fecha_aprobacion TIMESTAMPTZ,

  fecha_envio_dia1 TIMESTAMPTZ,
  fecha_envio_dia10 TIMESTAMPTZ,
  fecha_envio_dia20 TIMESTAMPTZ,
  fecha_envio_dia27 TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mes, anio)
);

-- Estado de cada clienta en el Club
CREATE TABLE club_ser_clientas (
  id SERIAL PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) UNIQUE,
  estado VARCHAR(30) NOT NULL DEFAULT 'nunca_compro',
  nivel VARCHAR(20) NOT NULL DEFAULT 'estandar',
  promedio_compra DECIMAL(15,2) DEFAULT 0,
  ultima_compra_fecha DATE,
  dias_desde_ultima_compra INT,
  total_compras INT DEFAULT 0,
  total_facturado DECIMAL(15,2) DEFAULT 0,
  racha_meses INT DEFAULT 0,
  mejor_racha INT DEFAULT 0,
  descuento_actual DECIMAL(5,2) DEFAULT 0,
  fecha_ultima_clasificacion DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_club_estado ON club_ser_clientas(estado);
CREATE INDEX idx_club_nivel ON club_ser_clientas(nivel);

-- Cupones generados
CREATE TABLE club_ser_cupones (
  id SERIAL PRIMARY KEY,
  campana_id INT REFERENCES club_ser_campanas(id),
  cliente_id UUID REFERENCES clientes(id),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'percentage',
  valor DECIMAL(5,2) NOT NULL,
  estado_cliente VARCHAR(30) NOT NULL,
  nivel_cliente VARCHAR(20) NOT NULL,

  tienda_nube_id BIGINT,
  sincronizado_tn BOOLEAN DEFAULT false,
  fecha_sincronizado TIMESTAMPTZ,

  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  monto_minimo DECIMAL(15,2) DEFAULT 120000,
  max_usos INT DEFAULT 1,

  usado BOOLEAN DEFAULT false,
  usado_en_pedido_id UUID REFERENCES pedidos(id),
  usado_en_pedido_tn_id BIGINT,
  fecha_uso TIMESTAMPTZ,
  monto_compra DECIMAL(15,2),
  monto_descuento DECIMAL(15,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cupones_codigo ON club_ser_cupones(codigo);
CREATE INDEX idx_cupones_cliente ON club_ser_cupones(cliente_id);
CREATE INDEX idx_cupones_campana ON club_ser_cupones(campana_id);

-- Log de emails enviados
CREATE TABLE club_ser_emails (
  id SERIAL PRIMARY KEY,
  campana_id INT NOT NULL REFERENCES club_ser_campanas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  tipo VARCHAR(20) NOT NULL,
  email_destino VARCHAR(255) NOT NULL,
  asunto VARCHAR(255) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  resend_email_id VARCHAR(100),
  error_mensaje TEXT,
  fecha_envio TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuración editable del Club
CREATE TABLE club_ser_config (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(50) NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed configuración inicial
INSERT INTO club_ser_config (clave, valor) VALUES
  ('umbral_vip', '300000'),
  ('descuento_activa_estandar', '10'),
  ('descuento_activa_vip', '12'),
  ('descuento_inactiva_estandar', '5'),
  ('descuento_inactiva_vip', '7'),
  ('descuento_reactivacion_estandar', '5'),
  ('descuento_reactivacion_vip', '7'),
  ('descuento_nunca_compro', '5'),
  ('monto_minimo_compra', '120000'),
  ('dias_inactiva', '30'),
  ('dias_dormida', '90'),
  ('dias_reactivacion', '150'),
  ('racha_envio_gratis', '3'),
  ('racha_subir_nivel', '12'),
  ('email_sender_name', 'Sermimomento'),
  ('email_sender_email', 'sheilaalalu@sermimomento.com.ar');

-- Campo en pedidos para cupones usados
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cupones_usados JSONB DEFAULT '[]';

-- RLS
ALTER TABLE club_ser_campanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_ser_clientas ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_ser_cupones ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_ser_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_ser_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_campanas_admin" ON club_ser_campanas FOR ALL TO authenticated USING (get_user_rol() = 'admin');
CREATE POLICY "club_clientas_admin" ON club_ser_clientas FOR ALL TO authenticated USING (get_user_rol() = 'admin');
CREATE POLICY "club_cupones_admin" ON club_ser_cupones FOR ALL TO authenticated USING (get_user_rol() = 'admin');
CREATE POLICY "club_emails_admin" ON club_ser_emails FOR ALL TO authenticated USING (get_user_rol() = 'admin');
CREATE POLICY "club_config_select" ON club_ser_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "club_config_admin" ON club_ser_config FOR ALL TO authenticated USING (get_user_rol() = 'admin');

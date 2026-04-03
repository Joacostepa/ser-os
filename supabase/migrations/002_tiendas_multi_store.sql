-- =============================================
-- SER Mayorista — Multi-Tienda + Integración TN
-- =============================================

-- Nuevo enum para canal
CREATE TYPE canal_tienda AS ENUM ('mayorista', 'minorista');
CREATE TYPE sync_job_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE sync_job_type AS ENUM ('products', 'customers', 'orders', 'stock');

-- =============================================
-- TABLA TIENDAS — credenciales de cada tienda TN
-- =============================================
CREATE TABLE tiendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  canal canal_tienda NOT NULL UNIQUE,
  tienda_nube_store_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  webhook_secret TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  ultima_sincronizacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- MODIFICAR PEDIDOS — agregar tienda_id
-- =============================================
ALTER TABLE pedidos ADD COLUMN tienda_id UUID REFERENCES tiendas(id);

-- Cambiar constraint UNIQUE de tienda_nube_id a composite
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_tienda_nube_id_key;
CREATE UNIQUE INDEX idx_pedidos_tn_id_tienda
  ON pedidos(tienda_nube_id, tienda_id) WHERE tienda_nube_id IS NOT NULL;

-- =============================================
-- JUNCTION: CLIENTES ↔ TIENDAS
-- =============================================
-- Un cliente puede existir en ambas tiendas (dedup por email)
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_tienda_nube_id_key;

CREATE TABLE clientes_tienda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tienda_id UUID NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  tienda_nube_customer_id TEXT NOT NULL,
  UNIQUE(tienda_id, tienda_nube_customer_id)
);
CREATE INDEX idx_clientes_tienda_cliente ON clientes_tienda(cliente_id);

-- =============================================
-- JUNCTION: PRODUCTOS ↔ TIENDAS
-- =============================================
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_tienda_nube_id_key;

CREATE TABLE productos_tienda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tienda_id UUID NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  tienda_nube_product_id TEXT NOT NULL,
  publicado BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(tienda_id, tienda_nube_product_id)
);
CREATE INDEX idx_productos_tienda_producto ON productos_tienda(producto_id);

-- =============================================
-- JUNCTION: VARIANTES ↔ TIENDAS
-- =============================================
ALTER TABLE variantes DROP CONSTRAINT IF EXISTS variantes_tienda_nube_id_key;

CREATE TABLE variantes_tienda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variante_id UUID NOT NULL REFERENCES variantes(id) ON DELETE CASCADE,
  tienda_id UUID NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  tienda_nube_variant_id TEXT NOT NULL,
  stock_tn INTEGER,
  precio_tn NUMERIC(12,2),
  UNIQUE(tienda_id, tienda_nube_variant_id)
);
CREATE INDEX idx_variantes_tienda_variante ON variantes_tienda(variante_id);

-- =============================================
-- WEBHOOK EVENTS — idempotencia y auditoría
-- =============================================
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id UUID NOT NULL REFERENCES tiendas(id),
  event TEXT NOT NULL,
  tn_resource_id TEXT NOT NULL,
  tn_store_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  payload JSONB,
  fetched_data JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_lookup ON webhook_events(tienda_id, event, tn_resource_id);

-- =============================================
-- SYNC JOBS — tracking de importaciones
-- =============================================
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id UUID NOT NULL REFERENCES tiendas(id),
  tipo sync_job_type NOT NULL,
  status sync_job_status NOT NULL DEFAULT 'pending',
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE tiendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_tienda ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_tienda ENABLE ROW LEVEL SECURITY;
ALTER TABLE variantes_tienda ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

-- Tiendas: todos ven, solo admin modifica
CREATE POLICY "tiendas_select" ON tiendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "tiendas_admin" ON tiendas FOR ALL TO authenticated USING (get_user_rol() = 'admin');

-- Junction tables: todos ven
CREATE POLICY "clientes_tienda_select" ON clientes_tienda FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes_tienda_insert" ON clientes_tienda FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "productos_tienda_select" ON productos_tienda FOR SELECT TO authenticated USING (true);
CREATE POLICY "productos_tienda_insert" ON productos_tienda FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "variantes_tienda_select" ON variantes_tienda FOR SELECT TO authenticated USING (true);
CREATE POLICY "variantes_tienda_insert" ON variantes_tienda FOR INSERT TO authenticated WITH CHECK (true);

-- Webhook events y sync jobs: solo admin
CREATE POLICY "webhook_events_select" ON webhook_events FOR SELECT TO authenticated USING (get_user_rol() = 'admin');
CREATE POLICY "webhook_events_insert" ON webhook_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sync_jobs_select" ON sync_jobs FOR SELECT TO authenticated USING (get_user_rol() = 'admin');
CREATE POLICY "sync_jobs_admin" ON sync_jobs FOR ALL TO authenticated USING (get_user_rol() = 'admin');

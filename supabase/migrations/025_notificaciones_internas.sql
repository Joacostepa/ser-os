-- ============================================================
-- 025: Notificaciones internas — schema completo
-- ============================================================

-- Agregar columnas que faltan a la tabla notificaciones existente
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id);
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS titulo VARCHAR(255);
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS mensaje TEXT;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS leida BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS leida_at TIMESTAMPTZ;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS recurso_tipo VARCHAR(30);
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS recurso_id UUID;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS datos JSONB;

-- Backfill: copiar datos de columnas viejas a nuevas
UPDATE notificaciones SET titulo = asunto WHERE titulo IS NULL AND asunto IS NOT NULL;
UPDATE notificaciones SET mensaje = contenido WHERE mensaje IS NULL AND contenido IS NOT NULL;
UPDATE notificaciones SET leida = enviada WHERE leida = false AND enviada = true;
UPDATE notificaciones SET recurso_tipo = 'pedido', recurso_id = pedido_id WHERE recurso_tipo IS NULL AND pedido_id IS NOT NULL;

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_notif_usuario_leida ON notificaciones(usuario_id, leida, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_tipo ON notificaciones(tipo);

-- RLS
CREATE POLICY "notif_select_own" ON notificaciones FOR SELECT TO authenticated
  USING (usuario_id = get_user_id());
CREATE POLICY "notif_insert" ON notificaciones FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "notif_update_own" ON notificaciones FOR UPDATE TO authenticated
  USING (usuario_id = get_user_id());

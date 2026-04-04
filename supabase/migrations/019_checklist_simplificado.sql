-- ============================================================
-- 019: Checklist simplificado — pedido_pasos + checklist_templates
-- ============================================================

-- Checklist del pedido (pasos simples, sin dependencias)
CREATE TABLE IF NOT EXISTS pedido_pasos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  completado BOOLEAN NOT NULL DEFAULT false,
  completado_por UUID REFERENCES usuarios(id),
  completado_at TIMESTAMPTZ,
  asignado_a UUID REFERENCES usuarios(id),
  seccion VARCHAR(30),
  orden INT NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedido_pasos_pedido ON pedido_pasos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_pasos_asignado ON pedido_pasos(asignado_a, completado);

-- Plantillas de checklist (1 JSON por tipo de pedido)
CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pedido VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  pasos JSONB NOT NULL,
  activo BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE pedido_pasos ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedido_pasos_select" ON pedido_pasos FOR SELECT TO authenticated USING (true);
CREATE POLICY "pedido_pasos_insert" ON pedido_pasos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pedido_pasos_update" ON pedido_pasos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "pedido_pasos_delete" ON pedido_pasos FOR DELETE TO authenticated USING (get_user_rol() IN ('admin', 'operaciones'));

CREATE POLICY "checklist_templates_select" ON checklist_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist_templates_admin" ON checklist_templates FOR ALL TO authenticated USING (get_user_rol() = 'admin');

-- Seed plantillas
INSERT INTO checklist_templates (tipo_pedido, nombre, pasos) VALUES
('marca_blanca', 'Marca blanca', '[
  {"titulo": "Imprimir detalle del pedido", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Separar textiles del stock", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Guardar en zona de pre-armado", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Poner cartón a textiles", "seccion": "armado", "asignado_default": null},
  {"titulo": "Embalar en caja con pluribol", "seccion": "armado", "asignado_default": null},
  {"titulo": "Poner tarjetón de agradecimiento", "seccion": "armado", "asignado_default": null},
  {"titulo": "Cerrar caja", "seccion": "armado", "asignado_default": null},
  {"titulo": "Marcar como empaquetado", "seccion": "armado", "asignado_default": null}
]'),
('logo_ser', 'Logo SER', '[
  {"titulo": "Imprimir detalle del pedido", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Separar textiles del stock", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Resaltar items con color", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Guardar en zona de pre-armado", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Pegar cartel identificatorio", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Pegar stickers SER", "seccion": "armado", "asignado_default": null},
  {"titulo": "Poner cartón a textiles", "seccion": "armado", "asignado_default": null},
  {"titulo": "Embalar en caja con pluribol", "seccion": "armado", "asignado_default": null},
  {"titulo": "Poner tarjetón de agradecimiento", "seccion": "armado", "asignado_default": null},
  {"titulo": "Cerrar caja", "seccion": "armado", "asignado_default": null},
  {"titulo": "Marcar como empaquetado", "seccion": "armado", "asignado_default": null}
]'),
('personalizado', 'Personalizado', '[
  {"titulo": "Diseñar stickers personalizados", "seccion": "diseno", "asignado_default": null},
  {"titulo": "Diseñar etiqueta eco cuero", "seccion": "diseno", "asignado_default": null},
  {"titulo": "Enviar stickers a Masterprint", "seccion": "diseno", "asignado_default": null},
  {"titulo": "Enviar eco cuero a Gerardo", "seccion": "diseno", "asignado_default": null},
  {"titulo": "Imprimir detalle del pedido", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Separar textiles del stock", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Resaltar items con color", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Guardar en zona de pre-armado", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Pegar cartel identificatorio", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Recibir stickers de Masterprint", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Recibir eco cuero de Gerardo", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Enviar textiles a Olga", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Recibir textiles de Olga", "seccion": "prearmado", "asignado_default": null},
  {"titulo": "Pegar stickers personalizados", "seccion": "armado", "asignado_default": null},
  {"titulo": "Poner cartón a textiles", "seccion": "armado", "asignado_default": null},
  {"titulo": "Embalar en caja con pluribol", "seccion": "armado", "asignado_default": null},
  {"titulo": "Poner tarjetón de agradecimiento", "seccion": "armado", "asignado_default": null},
  {"titulo": "Cerrar caja", "seccion": "armado", "asignado_default": null}
]')
ON CONFLICT (tipo_pedido) DO NOTHING;

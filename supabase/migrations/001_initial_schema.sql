-- =============================================
-- SER Mayorista — Schema Inicial (MVP)
-- =============================================

-- Enums
CREATE TYPE rol_usuario AS ENUM ('admin', 'operaciones', 'diseno', 'armado', 'logistica', 'contabilidad');
CREATE TYPE categoria_cliente AS ENUM ('nuevo', 'recurrente', 'vip');
CREATE TYPE tipo_producto AS ENUM ('estandar', 'personalizable');
CREATE TYPE tipo_pedido AS ENUM ('estandar', 'personalizado');
CREATE TYPE estado_interno AS ENUM (
  'nuevo', 'pendiente_sena', 'sena_recibida', 'en_prearmado',
  'esperando_insumos', 'esperando_diseno', 'insumos_recibidos',
  'listo_para_armar', 'en_armado', 'armado_completo',
  'pendiente_saldo', 'listo_para_despacho', 'en_preparacion_envio',
  'despachado', 'cerrado', 'cancelado'
);
CREATE TYPE estado_publico AS ENUM (
  'recibido', 'en_produccion', 'en_diseno', 'en_preparacion',
  'listo_pendiente_pago', 'listo_para_envio', 'enviado', 'entregado'
);
CREATE TYPE prioridad AS ENUM ('urgente', 'normal', 'baja');
CREATE TYPE tipo_despacho AS ENUM ('envio', 'retiro_oficina');
CREATE TYPE estado_tarea AS ENUM ('pendiente', 'en_proceso', 'terminada', 'bloqueada');
CREATE TYPE area_tarea AS ENUM ('diseno', 'operaciones', 'armado', 'logistica', 'admin');
CREATE TYPE tipo_pago AS ENUM ('cobro', 'pago_proveedor', 'gasto');
CREATE TYPE concepto_pago AS ENUM ('sena', 'saldo', 'pago_total', 'gasto_operativo');
CREATE TYPE tipo_notificacion AS ENUM ('interna', 'email_cliente', 'whatsapp');

-- =============================================
-- TABLAS
-- =============================================

-- Usuarios internos del sistema
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  rol rol_usuario NOT NULL DEFAULT 'operaciones',
  activo BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clientes mayoristas
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_nube_id TEXT UNIQUE,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  cuit TEXT,
  direccion JSONB,
  categoria categoria_cliente NOT NULL DEFAULT 'nuevo',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Productos del catálogo
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_nube_id TEXT UNIQUE,
  nombre TEXT NOT NULL,
  sku TEXT,
  categoria TEXT,
  tipo tipo_producto NOT NULL DEFAULT 'estandar',
  costo_base NUMERIC(12,2),
  precio_mayorista NUMERIC(12,2),
  stock_minimo INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Variantes de producto
CREATE TABLE variantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tienda_nube_id TEXT UNIQUE,
  nombre TEXT NOT NULL,
  sku TEXT,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_reservado INTEGER NOT NULL DEFAULT 0,
  costo NUMERIC(12,2),
  precio NUMERIC(12,2)
);

-- Pedidos (tabla central)
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_tn TEXT,
  tienda_nube_id TEXT UNIQUE,
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  tipo tipo_pedido NOT NULL DEFAULT 'estandar',
  estado_interno estado_interno NOT NULL DEFAULT 'nuevo',
  estado_publico estado_publico NOT NULL DEFAULT 'recibido',
  prioridad prioridad NOT NULL DEFAULT 'normal',
  fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_comprometida DATE,
  monto_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_pagado NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_pendiente NUMERIC(12,2) GENERATED ALWAYS AS (monto_total - monto_pagado) STORED,
  tipo_despacho tipo_despacho,
  observaciones TEXT,
  datos_envio JSONB,
  codigo_seguimiento TEXT NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_pedidos_codigo_seguimiento ON pedidos(codigo_seguimiento);
CREATE INDEX idx_pedidos_estado ON pedidos(estado_interno);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);

-- Items del pedido
CREATE TABLE items_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  variante_id UUID REFERENCES variantes(id),
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_unitario NUMERIC(12,2),
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  personalizacion JSONB
);

-- Plantillas de tareas (templates configurables)
CREATE TABLE plantillas_tarea (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pedido tipo_pedido NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  area area_tarea NOT NULL,
  responsable_rol rol_usuario NOT NULL,
  orden INTEGER NOT NULL,
  depende_de_orden INTEGER[] NOT NULL DEFAULT '{}',
  es_obligatoria BOOLEAN NOT NULL DEFAULT true
);

-- Tareas operativas
CREATE TABLE tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  plantilla_tarea_id UUID REFERENCES plantillas_tarea(id),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  estado estado_tarea NOT NULL DEFAULT 'pendiente',
  responsable_id UUID REFERENCES usuarios(id),
  area area_tarea NOT NULL DEFAULT 'operaciones',
  orden INTEGER NOT NULL DEFAULT 0,
  fecha_limite TIMESTAMPTZ,
  depende_de UUID[] NOT NULL DEFAULT '{}',
  completada_por UUID REFERENCES usuarios(id),
  completada_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tareas_pedido ON tareas(pedido_id);
CREATE INDEX idx_tareas_responsable ON tareas(responsable_id);
CREATE INDEX idx_tareas_estado ON tareas(estado);

-- Subtareas
CREATE TABLE subtareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  completada BOOLEAN NOT NULL DEFAULT false,
  orden INTEGER NOT NULL DEFAULT 0
);

-- Pagos
CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_pago NOT NULL DEFAULT 'cobro',
  pedido_id UUID REFERENCES pedidos(id),
  cliente_id UUID REFERENCES clientes(id),
  monto NUMERIC(12,2) NOT NULL,
  metodo TEXT NOT NULL,
  concepto concepto_pago NOT NULL,
  comprobante_url TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagos_pedido ON pagos(pedido_id);

-- Historial de pedido (log inmutable)
CREATE TABLE historial_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  accion TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  datos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_historial_pedido ON historial_pedido(pedido_id);

-- Comentarios (polimórficos: pedido o tarea)
CREATE TABLE comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo TEXT NOT NULL CHECK (entidad_tipo IN ('pedido', 'tarea')),
  entidad_id UUID NOT NULL,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  contenido TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comentarios_entidad ON comentarios(entidad_tipo, entidad_id);

-- Archivos adjuntos (polimórficos)
CREATE TABLE archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo TEXT NOT NULL CHECK (entidad_tipo IN ('pedido', 'tarea', 'cliente')),
  entidad_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo_mime TEXT,
  subido_por UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_archivos_entidad ON archivos(entidad_tipo, entidad_id);

-- Notificaciones
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_notificacion NOT NULL DEFAULT 'interna',
  destinatario TEXT NOT NULL,
  asunto TEXT NOT NULL,
  contenido TEXT NOT NULL,
  plantilla_id TEXT,
  pedido_id UUID REFERENCES pedidos(id),
  enviada BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TRIGGERS Y FUNCIONES
-- =============================================

-- Actualizar updated_at en pedidos
CREATE OR REPLACE FUNCTION update_pedido_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pedido_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION update_pedido_updated_at();

-- Registrar cambios de estado en historial
CREATE OR REPLACE FUNCTION log_estado_pedido()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado_interno IS DISTINCT FROM NEW.estado_interno THEN
    INSERT INTO historial_pedido (pedido_id, accion, estado_anterior, estado_nuevo)
    VALUES (NEW.id, 'Cambio de estado', OLD.estado_interno::TEXT, NEW.estado_interno::TEXT);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_estado_pedido
  AFTER UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION log_estado_pedido();

-- Actualizar monto_pagado del pedido al insertar/eliminar pagos
CREATE OR REPLACE FUNCTION actualizar_monto_pagado()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE pedidos
    SET monto_pagado = COALESCE((
      SELECT SUM(monto) FROM pagos WHERE pedido_id = NEW.pedido_id AND tipo = 'cobro'
    ), 0)
    WHERE id = NEW.pedido_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pedidos
    SET monto_pagado = COALESCE((
      SELECT SUM(monto) FROM pagos WHERE pedido_id = OLD.pedido_id AND tipo = 'cobro'
    ), 0)
    WHERE id = OLD.pedido_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_monto_pagado
  AFTER INSERT OR UPDATE OR DELETE ON pagos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_monto_pagado();

-- Función para generar tareas desde plantillas
CREATE OR REPLACE FUNCTION generar_tareas_pedido(p_pedido_id UUID, p_tipo tipo_pedido)
RETURNS void AS $$
DECLARE
  plantilla RECORD;
  tarea_ids JSONB := '{}';
  nueva_tarea_id UUID;
  dep_ids UUID[];
BEGIN
  -- Primero crear todas las tareas sin dependencias
  FOR plantilla IN
    SELECT * FROM plantillas_tarea
    WHERE tipo_pedido = p_tipo
    ORDER BY orden
  LOOP
    INSERT INTO tareas (pedido_id, plantilla_tarea_id, titulo, descripcion, area, orden, depende_de)
    VALUES (p_pedido_id, plantilla.id, plantilla.titulo, plantilla.descripcion, plantilla.area, plantilla.orden, '{}')
    RETURNING id INTO nueva_tarea_id;

    tarea_ids := tarea_ids || jsonb_build_object(plantilla.orden::TEXT, nueva_tarea_id::TEXT);
  END LOOP;

  -- Ahora actualizar las dependencias usando los IDs reales
  FOR plantilla IN
    SELECT * FROM plantillas_tarea
    WHERE tipo_pedido = p_tipo AND array_length(depende_de_orden, 1) > 0
  LOOP
    dep_ids := '{}';
    FOR i IN 1..array_length(plantilla.depende_de_orden, 1) LOOP
      IF tarea_ids ? plantilla.depende_de_orden[i]::TEXT THEN
        dep_ids := dep_ids || (tarea_ids->>plantilla.depende_de_orden[i]::TEXT)::UUID;
      END IF;
    END LOOP;

    UPDATE tareas
    SET depende_de = dep_ids
    WHERE pedido_id = p_pedido_id AND plantilla_tarea_id = plantilla.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DATOS INICIALES — PLANTILLAS DE TAREAS
-- =============================================

-- Tareas estándar: PRE-ARMADO
INSERT INTO plantillas_tarea (tipo_pedido, titulo, area, responsable_rol, orden, depende_de_orden) VALUES
('estandar', 'Imprimir detalle del pedido', 'operaciones', 'operaciones', 1, '{}'),
('estandar', 'Separar textiles del stock', 'operaciones', 'operaciones', 2, '{1}'),
('estandar', 'Resaltar items con color', 'operaciones', 'operaciones', 3, '{2}'),
('estandar', 'Guardar en zona de pre-armado', 'operaciones', 'operaciones', 4, '{3}'),
('estandar', 'Pegar cartel identificatorio', 'operaciones', 'operaciones', 5, '{4}');

-- Tareas estándar: ARMADO
INSERT INTO plantillas_tarea (tipo_pedido, titulo, area, responsable_rol, orden, depende_de_orden) VALUES
('estandar', 'Pegar stickers SER', 'armado', 'armado', 6, '{5}'),
('estandar', 'Poner cartón a textiles', 'armado', 'armado', 7, '{5}'),
('estandar', 'Embalar en caja con pluribol', 'armado', 'armado', 8, '{6,7}'),
('estandar', 'Poner tarjetón de agradecimiento', 'armado', 'armado', 9, '{8}'),
('estandar', 'Cerrar caja', 'armado', 'armado', 10, '{9}'),
('estandar', 'Marcar como empaquetado', 'armado', 'armado', 11, '{10}');

-- Tareas personalizado: PRE-ARMADO (mismas que estándar)
INSERT INTO plantillas_tarea (tipo_pedido, titulo, area, responsable_rol, orden, depende_de_orden) VALUES
('personalizado', 'Imprimir detalle del pedido', 'operaciones', 'operaciones', 1, '{}'),
('personalizado', 'Separar textiles del stock', 'operaciones', 'operaciones', 2, '{1}'),
('personalizado', 'Resaltar items con color', 'operaciones', 'operaciones', 3, '{2}'),
('personalizado', 'Guardar en zona de pre-armado', 'operaciones', 'operaciones', 4, '{3}'),
('personalizado', 'Pegar cartel identificatorio', 'operaciones', 'operaciones', 5, '{4}');

-- Tareas personalizado: DISEÑO
INSERT INTO plantillas_tarea (tipo_pedido, titulo, area, responsable_rol, orden, depende_de_orden) VALUES
('personalizado', 'Diseño de stickers', 'diseno', 'diseno', 6, '{}'),
('personalizado', 'Diseño de etiquetas eco cuero', 'diseno', 'diseno', 7, '{}'),
('personalizado', 'Enviar diseño eco cuero y maderas a Gerardo', 'operaciones', 'operaciones', 8, '{7}'),
('personalizado', 'Enviar stickers a Masterprint', 'operaciones', 'operaciones', 9, '{6}');

-- Tareas personalizado: PROVEEDORES
INSERT INTO plantillas_tarea (tipo_pedido, titulo, area, responsable_rol, orden, depende_de_orden) VALUES
('personalizado', 'Recibir stickers de Masterprint', 'operaciones', 'operaciones', 10, '{9}'),
('personalizado', 'Enviar textiles a Olga para etiqueta eco cuero', 'operaciones', 'operaciones', 11, '{2,8}'),
('personalizado', 'Recibir textiles de Olga', 'operaciones', 'operaciones', 12, '{11}');

-- Tareas personalizado: ARMADO
INSERT INTO plantillas_tarea (tipo_pedido, titulo, area, responsable_rol, orden, depende_de_orden) VALUES
('personalizado', 'Pegar stickers donde corresponda', 'armado', 'armado', 13, '{5,10,12}'),
('personalizado', 'Poner cartón a textiles', 'armado', 'armado', 14, '{5,10,12}'),
('personalizado', 'Embalar en caja con pluribol', 'armado', 'armado', 15, '{13,14}'),
('personalizado', 'Poner tarjetón de agradecimiento', 'armado', 'armado', 16, '{15}'),
('personalizado', 'Cerrar caja', 'armado', 'armado', 17, '{16}'),
('personalizado', 'Marcar como empaquetado', 'armado', 'armado', 18, '{17}');

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE variantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_tarea ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Función helper para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_rol()
RETURNS rol_usuario AS $$
  SELECT rol FROM usuarios WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función helper para obtener el ID del usuario actual
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
  SELECT id FROM usuarios WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Políticas para usuarios autenticados internos
-- Admin tiene acceso total a todas las tablas
-- Otros roles tienen acceso según la matriz de permisos

-- USUARIOS: todos los autenticados pueden ver, solo admin modifica
CREATE POLICY "usuarios_select" ON usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuarios_admin" ON usuarios FOR ALL TO authenticated USING (get_user_rol() = 'admin');

-- CLIENTES: todos pueden ver, solo admin hace CRUD completo
CREATE POLICY "clientes_select" ON clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes_insert" ON clientes FOR INSERT TO authenticated WITH CHECK (get_user_rol() = 'admin');
CREATE POLICY "clientes_update" ON clientes FOR UPDATE TO authenticated USING (get_user_rol() = 'admin');
CREATE POLICY "clientes_delete" ON clientes FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

-- PRODUCTOS: todos pueden ver
CREATE POLICY "productos_select" ON productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "productos_admin" ON productos FOR ALL TO authenticated USING (get_user_rol() = 'admin');

-- VARIANTES: todos pueden ver
CREATE POLICY "variantes_select" ON variantes FOR SELECT TO authenticated USING (true);
CREATE POLICY "variantes_admin" ON variantes FOR ALL TO authenticated USING (get_user_rol() = 'admin');

-- PEDIDOS: todos los autenticados pueden ver, solo admin/operaciones modifican
CREATE POLICY "pedidos_select" ON pedidos FOR SELECT TO authenticated USING (true);
CREATE POLICY "pedidos_insert" ON pedidos FOR INSERT TO authenticated WITH CHECK (
  get_user_rol() IN ('admin', 'operaciones')
);
CREATE POLICY "pedidos_update" ON pedidos FOR UPDATE TO authenticated USING (
  get_user_rol() IN ('admin', 'operaciones', 'logistica')
);

-- ITEMS_PEDIDO: todos pueden ver
CREATE POLICY "items_pedido_select" ON items_pedido FOR SELECT TO authenticated USING (true);
CREATE POLICY "items_pedido_modify" ON items_pedido FOR ALL TO authenticated USING (
  get_user_rol() IN ('admin', 'operaciones')
);

-- TAREAS: todos pueden ver, cada rol completa las suyas
CREATE POLICY "tareas_select" ON tareas FOR SELECT TO authenticated USING (true);
CREATE POLICY "tareas_insert" ON tareas FOR INSERT TO authenticated WITH CHECK (
  get_user_rol() IN ('admin', 'operaciones')
);
CREATE POLICY "tareas_update" ON tareas FOR UPDATE TO authenticated USING (true);

-- SUBTAREAS
CREATE POLICY "subtareas_select" ON subtareas FOR SELECT TO authenticated USING (true);
CREATE POLICY "subtareas_modify" ON subtareas FOR ALL TO authenticated USING (true);

-- PAGOS: admin y contabilidad tienen acceso completo
CREATE POLICY "pagos_select" ON pagos FOR SELECT TO authenticated USING (
  get_user_rol() IN ('admin', 'contabilidad', 'operaciones')
);
CREATE POLICY "pagos_modify" ON pagos FOR ALL TO authenticated USING (
  get_user_rol() IN ('admin', 'contabilidad')
);

-- HISTORIAL: todos pueden ver, nadie borra
CREATE POLICY "historial_select" ON historial_pedido FOR SELECT TO authenticated USING (true);
CREATE POLICY "historial_insert" ON historial_pedido FOR INSERT TO authenticated WITH CHECK (true);

-- COMENTARIOS
CREATE POLICY "comentarios_select" ON comentarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "comentarios_insert" ON comentarios FOR INSERT TO authenticated WITH CHECK (true);

-- ARCHIVOS
CREATE POLICY "archivos_select" ON archivos FOR SELECT TO authenticated USING (true);
CREATE POLICY "archivos_insert" ON archivos FOR INSERT TO authenticated WITH CHECK (true);

-- PLANTILLAS: todos ven, solo admin modifica
CREATE POLICY "plantillas_select" ON plantillas_tarea FOR SELECT TO authenticated USING (true);
CREATE POLICY "plantillas_admin" ON plantillas_tarea FOR ALL TO authenticated USING (get_user_rol() = 'admin');

-- NOTIFICACIONES
CREATE POLICY "notificaciones_select" ON notificaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "notificaciones_insert" ON notificaciones FOR INSERT TO authenticated WITH CHECK (true);

-- Política anónima para el portal del cliente (seguimiento por código)
CREATE POLICY "pedidos_seguimiento_anon" ON pedidos FOR SELECT TO anon USING (true);
CREATE POLICY "items_pedido_anon" ON items_pedido FOR SELECT TO anon USING (true);

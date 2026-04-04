-- ============================================================
-- 018: Usuarios y roles — campos adicionales + invitaciones
-- ============================================================

-- Campos adicionales en usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellido VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS area VARCHAR(30);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS invitado_por UUID REFERENCES usuarios(id);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_invitacion TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Tabla invitaciones
CREATE TABLE IF NOT EXISTS invitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  rol VARCHAR(20) NOT NULL,
  area VARCHAR(30),
  token VARCHAR(64) NOT NULL UNIQUE,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  invitado_por UUID NOT NULL REFERENCES usuarios(id),
  fecha_expiracion TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitaciones_email ON invitaciones(email);
CREATE INDEX IF NOT EXISTS idx_invitaciones_token ON invitaciones(token);

ALTER TABLE invitaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitaciones_select" ON invitaciones FOR SELECT TO authenticated USING (get_user_rol() = 'admin');
CREATE POLICY "invitaciones_insert" ON invitaciones FOR INSERT TO authenticated WITH CHECK (get_user_rol() = 'admin');
CREATE POLICY "invitaciones_update" ON invitaciones FOR UPDATE TO authenticated USING (get_user_rol() = 'admin');

CREATE TABLE push_subscriptions (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  user_agent TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, endpoint)
);

CREATE INDEX idx_push_sub_usuario ON push_subscriptions(usuario_id, activa);

CREATE TABLE push_preferencias (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) UNIQUE,
  pedido_nuevo BOOLEAN DEFAULT true,
  pago_recibido BOOLEAN DEFAULT true,
  checklist_completo BOOLEAN DEFAULT true,
  paso_asignado BOOLEAN DEFAULT true,
  pedido_estancado BOOLEAN DEFAULT true,
  stock_critico BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_sub_own" ON push_subscriptions FOR ALL TO authenticated
  USING (usuario_id = get_user_id());

CREATE POLICY "push_pref_own" ON push_preferencias FOR ALL TO authenticated
  USING (usuario_id = get_user_id());
